"""Bundle any interactives tool into a single self-contained HTML file for review.

Repo-wide and tool-agnostic: it reads a tool's own `index.html` and inlines whatever that
references — no per-tool file lists. It handles the shell shared by these tools (a vendored
chart-engine IIFE + ES-module app code + a manifest-driven `data/` tree).

Inlines:
  - every local <link rel="stylesheet"> (Style-Guide colors/fonts + the tool's styles),
    with Google-Fonts @import stripped and the Figtree variable font embedded (SIL OFL);
  - every local <script>: a plain script (e.g. the vendored engine `live.js`) verbatim, and a
    `type="module"` entry bundled by resolving its local static + dynamic import graph and
    stripping module syntax;
  - every file under the tool's `data/` (manifest + CSVs), served through a fetch() shim;
  - the Budget Lab logo (assets/logo.svg) as a data URL.

The output needs no network connection to view.

Usage:
  python scripts/build-standalone.py <tool>        # e.g. state-of-tariffs
  python scripts/build-standalone.py --list        # list buildable tools
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TOOLS_DIR = REPO_ROOT / "tools"
ASSETS = REPO_ROOT / "assets"
LIB_CACHE = Path(__file__).resolve().parent / "_libs"

FIGTREE_TTF_URL = "https://github.com/google/fonts/raw/main/ofl/figtree/Figtree%5Bwght%5D.ttf"

# Data files the fetch shim will serve (the app fetches manifest.json + CSVs; download-all zips
# CSVs). Text-decodable formats only — a stray binary under data/ is skipped with a warning.
DATA_SUFFIXES = {".csv", ".tsv", ".json", ".txt", ".md", ".yaml", ".yml"}


# ---------- module bundling ------------------------------------------------

STATIC_IMPORT_RE = re.compile(
    r"""import\s+(?:[^'"]+?\s+from\s+)?['"](?P<spec>\.[^'"]+)['"]\s*;?""")
DYNAMIC_IMPORT_RE = re.compile(r"""import\(\s*['"](?P<spec>\.[^'"]+)['"]\s*\)""")


def local_import_specs(src: str) -> list[str]:
    """Relative-path specifiers this module imports (static + dynamic)."""
    specs = [m.group("spec") for m in STATIC_IMPORT_RE.finditer(src)]
    specs += [m.group("spec") for m in DYNAMIC_IMPORT_RE.finditer(src)]
    return specs


def dynamic_import_specs(src: str) -> list[str]:
    return [m.group("spec") for m in DYNAMIC_IMPORT_RE.finditer(src)]


def export_bindings(src: str) -> list[tuple[str, str]]:
    """(exported_name, local_binding) pairs — the namespace `import("./x")` resolves to."""
    out: list[tuple[str, str]] = []
    for m in re.finditer(r"\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", src):
        out.append((m.group(1), m.group(1)))
    for m in re.finditer(r"\bexport\s+class\s+([A-Za-z_$][\w$]*)", src):
        out.append((m.group(1), m.group(1)))
    for m in re.finditer(r"\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)", src):
        out.append((m.group(1), m.group(1)))
    for block in re.finditer(r"\bexport\s*\{([^}]*)\}", src):
        for part in block.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            if " as " in part:
                local, _, exported = part.partition(" as ")
                out.append((exported.strip(), local.strip()))
            else:
                out.append((part, part))
    # de-dup, keep order
    seen, uniq = set(), []
    for pair in out:
        if pair[0] not in seen:
            seen.add(pair[0])
            uniq.append(pair)
    return uniq


def strip_module_syntax(js: str) -> str:
    """Turn ES-module source into something runnable as a classic <script>."""
    js = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"][^'\"]+['\"];?\s*", "", js, flags=re.S)
    js = re.sub(r"import\s+\*\s+as\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*", "", js)
    js = re.sub(r"import\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*", "", js)
    js = re.sub(r"import\s+['\"][^'\"]+['\"];?\s*", "", js)  # bare side-effect import
    js = re.sub(r"\bexport\s+async\s+function\b", "async function", js)
    js = re.sub(r"\bexport\s+function\b", "function", js)
    js = re.sub(r"\bexport\s+class\b", "class", js)
    js = re.sub(r"\bexport\s+const\b", "const", js)
    js = re.sub(r"\bexport\s+let\b", "let", js)
    js = re.sub(r"\bexport\s+var\b", "var", js)
    js = re.sub(r"export\s*\{[^}]*\};?\s*", "", js, flags=re.S)
    js = re.sub(r"\bimport\.meta\.url\b", "document.baseURI", js)
    return js


def module_id(path: Path) -> str:
    return re.sub(r"[^\w]", "_", path.stem)


def bundle_module_graph(entry: Path) -> str:
    """Inline `entry` and its local import graph into one classic-script body.

    Modules are emitted dependency-first (so a module's top-level `const`/`function` bindings are
    in scope for its importers, which share the classic-script global lexical scope). Each
    dynamically-imported module gets a `const __esm_<id> = {…}` namespace, and `import("./x")`
    sites are rewritten to `Promise.resolve(__esm_x)`.
    """
    order: list[Path] = []
    seen: set[Path] = set()
    dynamic_targets: set[Path] = set()

    def visit(path: Path) -> None:
        path = path.resolve()
        if path in seen:
            return
        seen.add(path)
        src = path.read_text(encoding="utf-8")
        for spec in dynamic_import_specs(src):
            dynamic_targets.add((path.parent / spec).resolve())
        for spec in local_import_specs(src):
            dep = (path.parent / spec).resolve()
            if dep.exists():
                visit(dep)
            else:
                print(f"  ! import not found, left as-is: {spec} (from {path.name})")
        order.append(path)  # post-order: deps before dependents

    visit(entry)

    chunks: list[str] = []
    for path in order:
        src = path.read_text(encoding="utf-8")
        code = strip_module_syntax(src)
        # rewrite dynamic imports of local modules → the inlined namespace object
        def _rewrite(m: re.Match) -> str:
            dep = (path.parent / m.group("spec")).resolve()
            return f"Promise.resolve(__esm_{module_id(dep)})"
        code = DYNAMIC_IMPORT_RE.sub(_rewrite, code)
        chunks.append(f"// === {path.name} " + "=" * max(4, 60 - len(path.name)) + f"\n{code}")
        if path in dynamic_targets:
            ns = ", ".join(
                (exported if exported == local else f"{exported}: {local}")
                for exported, local in export_bindings(src)
            )
            chunks.append(f"const __esm_{module_id(path)} = {{ {ns} }};")
    return "\n\n".join(chunks)


# ---------- assets ---------------------------------------------------------

def is_external(href: str) -> bool:
    return href.startswith(("http://", "https://", "//", "data:"))


def resolve_local(href: str, base_dir: Path) -> "Path | None":
    """Resolve a local href (dropping any ?query/#hash) to a file path, or None if external."""
    if is_external(href):
        return None
    clean = href.split("?", 1)[0].split("#", 1)[0]
    return (base_dir / clean).resolve()


def fetch_figtree_face() -> "str | None":
    LIB_CACHE.mkdir(exist_ok=True)
    cached = LIB_CACHE / "Figtree-variable.ttf"
    if not cached.exists():
        try:
            print("  downloading Figtree variable font...")
            urllib.request.urlretrieve(FIGTREE_TTF_URL, cached)
        except Exception as e:  # offline: skip embedding, fall back to system sans
            print(f"  ! could not fetch Figtree ({e}); output will use a system font")
            return None
    b64 = base64.b64encode(cached.read_bytes()).decode("ascii")
    print(f"  Figtree embedded ({len(b64) // 1024} KB)")
    return (
        "@font-face { font-family: 'Figtree'; "
        f"src: url(data:font/ttf;base64,{b64}) format('truetype'); "
        "font-weight: 300 900; font-style: normal; font-display: swap; }"
    )


def json_safe(obj) -> str:
    """JSON-encode, guarding `</script>` / `<!--` so embedded data can't close the block."""
    return (json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
            .replace("</", "<\\/").replace("<!--", "<\\u0021--"))


# ---------- build ----------------------------------------------------------

def build(tool: str) -> Path:
    tool_root = TOOLS_DIR / tool
    if not (tool_root / "index.html").exists():
        sys.exit(f"error: no tools/{tool}/index.html")
    data_dir = tool_root / "data"
    out_dir = tool_root / "dist"
    out_dir.mkdir(exist_ok=True)
    today = date.today().isoformat()
    html = (tool_root / "index.html").read_text(encoding="utf-8")

    # --- CSS: inline every local stylesheet, strip @import, embed Figtree ---
    print("Inlining CSS...")
    css_parts: list[str] = []
    for m in re.finditer(r'<link\b[^>]*\brel="stylesheet"[^>]*>', html):
        href_m = re.search(r'href="([^"]+)"', m.group(0))
        if not href_m:
            continue
        path = resolve_local(href_m.group(1), tool_root)
        if path and path.exists():
            css_parts.append(path.read_text(encoding="utf-8"))
        elif path:
            print(f"  ! stylesheet not found: {href_m.group(1)}")
    combined_css = "\n".join(css_parts)
    combined_css = re.sub(r"@import\s+url\([^)]+\)\s*;?", "", combined_css)  # kill network @imports
    figtree_face = fetch_figtree_face()
    style_block = "<style>\n" + (figtree_face + "\n" if figtree_face else "") + combined_css + "\n</style>"

    # --- JS: bundle the module entry, inline plain local scripts verbatim ---
    print("Bundling scripts...")
    script_sections: list[str] = []
    for m in re.finditer(r'<script\b([^>]*)\bsrc="([^"]+)"[^>]*>\s*</script>', html):
        attrs, src = m.group(1), m.group(2)
        path = resolve_local(src, tool_root)
        if path is None:
            print(f"  - skipping external script: {src}")
            continue
        if not path.exists():
            print(f"  ! script not found: {src}")
            continue
        if 'type="module"' in attrs:
            print(f"  bundling module graph from {path.name}")
            script_sections.append(bundle_module_graph(path))
        else:
            print(f"  inlining {path.name}")
            script_sections.append(path.read_text(encoding="utf-8"))

    # --- data: embed everything the app can fetch under data/ ---------------
    print("Embedding data...")
    inlined: dict[str, str] = {}
    if data_dir.exists():
        for f in sorted(data_dir.rglob("*")):
            if f.is_file() and f.suffix.lower() in DATA_SUFFIXES:
                try:
                    inlined[f.relative_to(data_dir).as_posix()] = f.read_text(encoding="utf-8")
                except UnicodeDecodeError:
                    print(f"  ! skipping non-text file: {f.relative_to(data_dir)}")
    print(f"  {len(inlined)} data files embedded")

    fetch_shim = """
// Serve the app's data requests (manifest.json + CSVs) from the embedded map instead of the
// network. Keyed by the path after the last "data/" segment, so it is independent of whatever
// base (./data/, an absolute URL, …) the app resolves requests against.
(function () {
  const orig = window.fetch ? window.fetch.bind(window) : null;
  const store = window.__inlinedData || {};
  window.fetch = (url) => {
    const s = String(url);
    const i = s.lastIndexOf("data/");
    const key = i >= 0 ? s.slice(i + 5).split(/[?#]/)[0] : null;
    const body = key != null ? store[key] : undefined;
    if (body !== undefined) {
      return Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(body),
        json: () => Promise.resolve(JSON.parse(body)),
      });
    }
    return orig ? orig(url) : Promise.reject(new Error("fetch unavailable: " + s));
  };
})();
"""
    head_js = f"window.__inlinedData = {json_safe(inlined)};\n{fetch_shim}"

    # --- logo → data URL ----------------------------------------------------
    logo = ASSETS / "logo.svg"
    if logo.exists():
        logo_url = "data:image/svg+xml;base64," + base64.b64encode(logo.read_bytes()).decode("ascii")
        html = re.sub(r'src="[^"]*assets/logo\.svg"', f'src="{logo_url}"', html)

    # --- rewrite the HTML: drop the tags we've inlined, inject blobs --------
    html = re.sub(r'<link\b[^>]*\brel="preconnect"[^>]*>\s*', "", html)
    html = re.sub(r'<link\b[^>]*\brel="stylesheet"[^>]*>\s*', "", html)
    html = re.sub(r'<script\b[^>]*\bsrc="[^"]+"[^>]*>\s*</script>\s*', "", html)
    html = html.replace("</head>", f"{style_block}\n</head>")
    body_scripts = (f"<script>\n{head_js}\n</script>\n"
                    + "\n".join(f"<script>\n{s}\n</script>" for s in script_sections))
    html = html.replace("</body>", f"{body_scripts}\n</body>")

    banner = (f"<!-- {tool} — standalone preview ({today})\n"
              f"     Generated by scripts/build-standalone.py — self-contained, no network needed. -->\n")
    html = banner + html

    out_path = out_dir / f"{tool}-standalone-{today}.html"
    out_path.write_text(html, encoding="utf-8")
    print(f"\nWrote {out_path.relative_to(REPO_ROOT)}  ({out_path.stat().st_size / 1024 / 1024:.2f} MB)")
    return out_path


def main() -> None:
    ap = argparse.ArgumentParser(description="Build a self-contained standalone HTML for a tool.")
    ap.add_argument("tool", nargs="?", help="tool directory under tools/ (e.g. state-of-tariffs)")
    ap.add_argument("--list", action="store_true", help="list buildable tools and exit")
    args = ap.parse_args()
    tools = sorted(p.name for p in TOOLS_DIR.iterdir() if (p / "index.html").exists())
    if args.list or not args.tool:
        print("Buildable tools:")
        for t in tools:
            print(f"  {t}")
        return
    if args.tool not in tools:
        sys.exit(f"error: '{args.tool}' is not a tool with an index.html. Try: {', '.join(tools)}")
    build(args.tool)


if __name__ == "__main__":
    main()
