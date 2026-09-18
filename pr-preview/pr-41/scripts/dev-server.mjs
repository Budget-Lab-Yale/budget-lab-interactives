/**
 * dev-server.mjs — local development server for budget-lab-interactives.
 *
 * The published site is a no-build static site (GitHub Pages serves the repo as-is). This
 * server is a DEV-ONLY convenience modeled on budget-lab-charts' dev server: it serves the
 * whole repo statically (so each tool's `../../assets`, `../../embed` paths resolve exactly
 * as in production), live-reloads the browser on save (SSE), and — for tools that have a
 * `scripts/build-manifest.py` (e.g. state-of-tariffs, ai-labor-market-tracker) — re-runs that
 * build automatically when the tool's `data/` changes, then reloads.
 *
 * Zero npm dependencies — pure Node. `npm run dev` just runs `node`. The only external
 * requirement is Python (for the manifest builds); override the interpreter with the PYTHON
 * env var (defaults to `python`).
 *
 * Usage:  npm run dev                 # serve at http://localhost:5173/
 *         npm run dev -- --open       # also open the browser
 *         npm run dev -- --tool state-of-tariffs --open   # open straight to a tool
 *         PYTHON=py npm run dev       # use a different Python interpreter
 */

import { createServer } from "node:http";
import { watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, resolve, dirname, sep, extname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// Paths we never react to (churn or generated): VCS, deps, editor, version snapshots.
const IGNORE_SEGMENTS = [".git", "node_modules", ".claude", `${sep}versions${sep}`];
// Only these extensions trigger a reload (avoids lockfile/temp churn).
const WATCH_EXTS = new Set([".html", ".js", ".mjs", ".css", ".json", ".csv", ".md", ".yaml", ".yml", ".svg"]);

// Live-reload client: subscribe to SSE and reload when a change touches this page.
const RELOAD_SNIPPET = `
<script>
(function () {
  try {
    var es = new EventSource("/__dev/events");
    es.addEventListener("message", function (e) {
      var d = {}; try { d = JSON.parse(e.data); } catch (_) {}
      if (d.type === "build-error") { console.error("[dev] manifest build failed:\\n" + d.message); return; }
      if (d.type !== "reload") return;
      var here = location.pathname;
      if (d.shared || !d.slug || here.indexOf("/tools/" + d.slug + "/") !== -1) location.reload();
    });
  } catch (_) {}
})();
</script>`;

function ignored(p) {
  return IGNORE_SEGMENTS.some((seg) => p.includes(seg));
}

// tools/<slug>/...  ->  <slug>   (null if the path isn't under a tool)
export function toolSlugFor(absPath) {
  const toolsRoot = join(REPO_ROOT, "tools") + sep;
  if (!absPath.startsWith(toolsRoot)) return null;
  return absPath.slice(toolsRoot.length).split(sep)[0] || null;
}

function pythonCmd() {
  return process.env.PYTHON || "python";
}

// Re-run a tool's build-manifest.py (if present). Returns { ok, output }.
function rebuildManifest(slug) {
  const script = join(REPO_ROOT, "tools", slug, "scripts", "build-manifest.py");
  if (!existsSync(script)) return { ok: true, output: "" };
  const r = spawnSync(pythonCmd(), ["scripts/build-manifest.py"], {
    cwd: join(REPO_ROOT, "tools", slug),
    encoding: "utf-8",
  });
  const output = `${r.stdout || ""}${r.stderr || ""}`.trim();
  if (r.error) return { ok: false, output: `${r.error.message} (is Python on PATH? set PYTHON=...)` };
  return { ok: r.status === 0, output };
}

async function serveStatic(pathname, res, { injectReload }) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  let abs = resolve(REPO_ROOT, rel);
  // Traversal guard: must stay within the repo.
  if (abs !== REPO_ROOT && !abs.startsWith(REPO_ROOT + sep)) {
    res.writeHead(403, { "content-type": "text/plain" });
    res.end("403 Forbidden");
    return;
  }
  // Directory -> index.html
  try {
    const st = await stat(abs);
    if (st.isDirectory()) abs = join(abs, "index.html");
  } catch {
    /* fall through to read attempt -> 404 */
  }
  try {
    const ext = extname(abs).toLowerCase();
    const type = CONTENT_TYPES[ext] ?? "application/octet-stream";
    if (ext === ".html" && injectReload) {
      let html = await readFile(abs, "utf-8");
      html = html.includes("</body>")
        ? html.replace("</body>", `${RELOAD_SNIPPET}\n</body>`)
        : html + RELOAD_SNIPPET;
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(html);
    } else {
      const buf = await readFile(abs);
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(buf);
    }
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("404 Not Found");
  }
}

export function createDevServer({ repoRoot = REPO_ROOT } = {}) {
  const sseClients = new Set();
  function broadcast(event) {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of sseClients) res.write(payload);
  }

  let debounceTimer = null;
  const pending = new Set();
  const watcher = watch(repoRoot, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const abs = resolve(repoRoot, filename.toString());
    if (ignored(abs)) return;
    const ext = extname(abs).toLowerCase();
    if (!WATCH_EXTS.has(ext)) return;
    // The generated manifest is a build OUTPUT — reacting to it would loop.
    if (basename(abs) === "manifest.json" && abs.includes(`${sep}data${sep}`)) return;
    pending.add(abs);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const changes = [...pending];
      pending.clear();
      const slugs = new Set(changes.map(toolSlugFor).filter(Boolean));
      const sharedChange = changes.some((p) => !toolSlugFor(p)); // assets/, embed/, root index.html

      // Rebuild manifests for tools whose data/ or scripts/ changed.
      for (const slug of slugs) {
        const needsBuild = changes.some(
          (p) =>
            toolSlugFor(p) === slug &&
            (p.includes(`${sep}data${sep}`) || p.includes(`${sep}scripts${sep}`)),
        );
        if (!needsBuild) continue;
        const { ok, output } = rebuildManifest(slug);
        if (ok) {
          if (output) console.log(`[dev] ${slug}: ${output}`);
        } else {
          console.error(`[dev] ${slug}: manifest build FAILED\n${output}`);
          broadcast({ type: "build-error", slug, message: output });
        }
      }

      if (sharedChange) broadcast({ type: "reload", shared: true });
      for (const slug of slugs) broadcast({ type: "reload", slug });
      if (!sharedChange && slugs.size === 0) broadcast({ type: "reload", shared: true });
    }, 150);
  });

  const server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost");
      if (u.pathname === "/__dev/events") {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        res.write(": connected\n\n");
        sseClients.add(res);
        req.on("close", () => sseClients.delete(res));
        return;
      }
      await serveStatic(u.pathname, res, { injectReload: true });
    } catch (err) {
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
      res.end(`Internal error: ${err.message}`);
    }
  });

  return {
    server,
    broadcast,
    close() {
      clearTimeout(debounceTimer);
      watcher.close();
      for (const res of sseClients) res.end();
      server.close();
    },
  };
}

export function parseArgs(argv) {
  let port = 5173;
  let open = false;
  let tool = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") port = Number(argv[++i]);
    else if (argv[i] === "--open") open = true;
    else if (argv[i] === "--tool") tool = argv[++i];
  }
  return { port, open, tool };
}

export function listenWithRetry(server, startPort, attempts = 20) {
  return (async () => {
    for (let p = startPort; p < startPort + attempts; p++) {
      try {
        await new Promise((res, rej) => {
          const onErr = (e) => { server.removeListener("listening", onOk); rej(e); };
          const onOk = () => { server.removeListener("error", onErr); res(); };
          server.once("error", onErr);
          server.once("listening", onOk);
          server.listen(p);
        });
        return p;
      } catch (e) {
        if (e.code !== "EADDRINUSE") throw e;
      }
    }
    throw new Error(`No free port found in ${startPort}..${startPort + attempts}`);
  })();
}

function openBrowser(url) {
  try {
    if (process.platform === "win32") spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    else if (process.platform === "darwin") spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    else spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* non-fatal — the URL is printed regardless */
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { port, open, tool } = parseArgs(process.argv.slice(2));
  const dev = createDevServer();
  const actual = await listenWithRetry(dev.server, port);
  const base = `http://localhost:${actual}`;
  const target = tool ? `${base}/tools/${tool}/` : `${base}/`;
  console.log(`budget-lab-interactives dev server: ${base}/`);
  console.log("Serving the repo root with live-reload; manifests rebuild on data changes.");
  if (tool) console.log(`Tool: ${target}`);
  if (open) openBrowser(target);
}
