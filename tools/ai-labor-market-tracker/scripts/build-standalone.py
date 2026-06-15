"""Bundle the AI Labor Market Tracker into a single self-contained HTML file
for team review.

Inlines:
  - All CSS (vendored Style-Guide colors + fonts + tool styles)
  - All JS (tbl-chart, charts, export-image, zip-store, download-all, app —
    module imports stripped)
  - d3 v7 + Observable Plot v0.6 (UMD builds, downloaded once and cached)
  - All data files (manifest.json + every CSV under data/)
  - Figtree variable font (SIL OFL — free to embed/redistribute)
  - Budget Lab logo SVG

The tracker renders in Figtree (styles.css sets --tbl-font-sans to Figtree),
so no proprietary fonts are embedded and the output is freely shareable.

Usage:
  python build-standalone.py
"""

from __future__ import annotations

import base64
import json
import re
import urllib.request
from datetime import date
from pathlib import Path


HERE = Path(__file__).resolve().parent
TOOL_ROOT = HERE.parent
REPO_ROOT = TOOL_ROOT.parent.parent

DATA_DIR = TOOL_ROOT / "data"
OUT_DIR = TOOL_ROOT / "dist"
LIB_CACHE = HERE / "_libs"

ASSETS = REPO_ROOT / "assets"

D3_URL   = "https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"
PLOT_URL = "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.16/dist/plot.umd.min.js"

# Figtree variable font (SIL OFL — free to embed/redistribute). One TTF
# covers the whole 300–900 weight axis, so a single @font-face replaces the
# Google Fonts @import that styles.css uses on the web (which would require a
# live connection and, once concatenated below other rules, is an invalid
# non-leading @import the browser silently drops).
FIGTREE_TTF_URL = (
    "https://github.com/google/fonts/raw/main/ofl/figtree/Figtree%5Bwght%5D.ttf"
)


# ---------- helpers --------------------------------------------------------

def fetch_lib(url: str, cache_name: str) -> str:
    LIB_CACHE.mkdir(exist_ok=True)
    cached = LIB_CACHE / cache_name
    if not cached.exists():
        print(f"  downloading {url}")
        urllib.request.urlretrieve(url, cached)
    return cached.read_text(encoding="utf-8")


def fetch_lib_bytes(url: str, cache_name: str) -> bytes:
    """Like fetch_lib but for binary assets (fonts) — never decode as text."""
    LIB_CACHE.mkdir(exist_ok=True)
    cached = LIB_CACHE / cache_name
    if not cached.exists():
        print(f"  downloading {url}")
        urllib.request.urlretrieve(url, cached)
    return cached.read_bytes()


def strip_module_syntax(js: str) -> str:
    """Turn ES module source into something runnable as a plain <script>."""
    # `import { a, b, ... } from "x"` (possibly multi-line)
    js = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"][^'\"]+['\"];?\s*", "", js, flags=re.S)
    # `import * as Foo from "x"`
    js = re.sub(r"import\s+\*\s+as\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*", "", js)
    # `import Foo from "x"`
    js = re.sub(r"import\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*", "", js)
    # `export function`, `export async function`, `export const`, `export let`
    js = re.sub(r"\bexport\s+async\s+function\b", "async function", js)
    js = re.sub(r"\bexport\s+function\b",         "function",        js)
    js = re.sub(r"\bexport\s+const\b",            "const",           js)
    js = re.sub(r"\bexport\s+let\b",              "let",             js)
    # `export { a, b, ... }` re-export blocks
    js = re.sub(r"export\s*\{[^}]*\};?\s*", "", js, flags=re.S)
    # `import.meta.url` is meaningless in a classic <script> and is a parse-time
    # SyntaxError there ("Cannot use 'import.meta' outside a module"), which kills
    # the entire concatenated bundle. The only uses (export-image.js's font/logo
    # fallbacks) are dead code in the bundle anyway — window.__figtreeFontFace and
    # window.__logoDataUrl are always set below — but the text must still parse.
    # Point it at the document base URL so it stays a valid URL() base.
    js = re.sub(r"\bimport\.meta\.url\b", "document.baseURI", js)
    return js


def replace_dynamic_charts_import(js: str) -> str:
    """app.js does `await import("./charts.js")` at first render. In the
    bundle, charts.js's exports are already in scope, so swap to a sync
    object literal."""
    return re.sub(
        r"await\s+import\(['\"]\./charts\.js['\"]\)",
        "{ renderFigure, renderCurrentUpdate }",
        js,
    )


def collect_data_paths(manifest: dict) -> list[str]:
    """Every data file the renderer fetches, as data/-relative paths. Mirrors
    download-all.js's collectPaths() + additional_downloads exactly: the chart
    `data` path for every chart, plus the download-only crosswalk files. These
    are the paths the app requests as DATA_BASE + path, so embedding precisely
    this set keeps the bundle's fetch shim in lockstep with the live tool —
    independent of file extension or where they sit under data/."""
    paths: list[str] = []
    seen: set[str] = set()

    def add(p: str | None) -> None:
        if p and p not in seen:
            seen.add(p)
            paths.append(p)

    for tab in manifest.get("tabs", []):
        for fig in tab.get("figures", []):
            for chart in fig.get("charts", []):
                add(chart.get("data"))
    for f in (manifest.get("additional_downloads") or {}).get("files", []):
        add(f.get("path"))
    return sorted(paths)


def json_safe(obj) -> str:
    """JSON-encode, then guard `</script>` and `<!--` so the embedded data
    can never close the script block."""
    return (
        json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
        .replace("</", "<\\/")
        .replace("<!--", "<\\u0021--")
    )


# ---------- build ----------------------------------------------------------

def build() -> Path:
    OUT_DIR.mkdir(exist_ok=True)
    today = date.today().isoformat()

    # --- 1. libraries (UMD) ----------------------------------------------
    print("Fetching libraries...")
    d3_src   = fetch_lib(D3_URL,   "d3.min.js")
    plot_src = fetch_lib(PLOT_URL, "plot.umd.min.js")

    # --- 2. CSS ----------------------------------------------------------
    print("Reading CSS...")
    colors_css   = (ASSETS / "style-guide" / "colors.css").read_text(encoding="utf-8")
    fonts_css    = (ASSETS / "style-guide" / "fonts.css").read_text(encoding="utf-8")
    styles_css   = (TOOL_ROOT / "styles.css").read_text(encoding="utf-8")
    # Remove every Google Fonts @import (we're going fully offline) and the
    # local()-based Mallory @font-face blocks (no-ops without Mallory installed,
    # and the tracker renders in Figtree regardless). The @import strip must hit
    # styles.css too — that's where the Figtree import lives, and a non-leading
    # @import in the concatenated <style> is invalid.
    fonts_css  = re.sub(r"@import\s+url\([^)]+\);?\s*", "", fonts_css)
    fonts_css  = re.sub(r"@font-face\s*\{[^}]*\}\s*", "", fonts_css, flags=re.S)
    styles_css = re.sub(r"@import\s+url\([^)]+\);?\s*", "", styles_css)

    # --- 2b. embed Figtree (offline replacement for the stripped @import) ---
    print("Encoding Figtree variable font...")
    figtree_path = TOOL_ROOT / "fonts" / "Figtree-variable.ttf"
    if figtree_path.exists():
        figtree_ttf = figtree_path.read_bytes()
    else:
        figtree_ttf = fetch_lib_bytes(FIGTREE_TTF_URL, "Figtree-variable.ttf")
    figtree_b64 = base64.b64encode(figtree_ttf).decode("ascii")
    print(f"  Figtree[wght].ttf  300-900  ({len(figtree_b64) // 1024} KB encoded)")
    figtree_face = (
        "@font-face { font-family: 'Figtree'; "
        f"src: url(data:font/ttf;base64,{figtree_b64}) format('truetype'); "
        "font-weight: 300 900; font-style: normal; font-display: swap; }"
    )

    # --- 4. JS sources ---------------------------------------------------
    print("Reading JS...")
    tbl_chart_js = (TOOL_ROOT / "tbl-chart.js").read_text(encoding="utf-8")
    charts_js    = (TOOL_ROOT / "charts.js").read_text(encoding="utf-8")
    app_js       = (TOOL_ROOT / "app.js").read_text(encoding="utf-8")

    tbl_chart_js = strip_module_syntax(tbl_chart_js)
    charts_js    = strip_module_syntax(charts_js)
    app_js       = strip_module_syntax(app_js)
    app_js       = replace_dynamic_charts_import(app_js)
    export_image_js = (TOOL_ROOT / "export-image.js").read_text(encoding="utf-8")
    export_image_js = strip_module_syntax(export_image_js)
    zip_store_js = (TOOL_ROOT / "zip-store.js").read_text(encoding="utf-8")
    zip_store_js = strip_module_syntax(zip_store_js)
    download_all_js = (TOOL_ROOT / "download-all.js").read_text(encoding="utf-8")
    download_all_js = strip_module_syntax(download_all_js)

    # --- 5. data ---------------------------------------------------------
    print("Reading data...")
    manifest = json.loads((DATA_DIR / "manifest.json").read_text(encoding="utf-8"))
    # app.js fetches the manifest from a fixed ./data/manifest.json, then resolves
    # data files against manifest.data_base_url (see app.js boot()). Key the shim
    # off the same field so the bundle's intercepted URLs match exactly what the
    # renderer requests — regardless of what the base is set to.
    data_base = manifest.get("data_base_url") or "./data/"
    inline_data = {"./data/manifest.json": manifest}
    # Embed exactly the files the manifest references — the same set the renderer
    # fetches at runtime — keyed under the URL it requests (data_base + path). A
    # referenced file missing on disk fails loudly here rather than producing a
    # silently-broken bundle.
    for rel in collect_data_paths(manifest):
        src = DATA_DIR / rel
        if not src.exists():
            raise FileNotFoundError(
                f"manifest references data/{rel} but no such file exists "
                f"(rebuild manifest.json with build-manifest.py?)")
        inline_data[f"{data_base}{rel}"] = src.read_text(encoding="utf-8")
    print(f"  {len(inline_data)} files embedded")

    # --- 6. logo ---------------------------------------------------------
    logo_svg = (ASSETS / "logo.svg").read_text(encoding="utf-8")
    logo_b64 = base64.b64encode(logo_svg.encode("utf-8")).decode("ascii")
    logo_data_url = f"data:image/svg+xml;base64,{logo_b64}"

    # --- 7. HTML shell ---------------------------------------------------
    print("Assembling HTML...")
    index_html = (TOOL_ROOT / "index.html").read_text(encoding="utf-8")

    # Strip preconnects + external stylesheets + module script + iframe-resizer
    out = index_html
    out = re.sub(r'<link\s+rel="preconnect"[^>]*>\s*',                          "", out)
    out = re.sub(r'<link\s+rel="stylesheet"\s+href="[^"]+"[^>]*>\s*',           "", out)
    out = re.sub(r'<script\s+type="module"\s+src="app\.js"></script>\s*',       "", out)
    out = re.sub(
        r'<script\s+src="\.\./\.\./embed/v1/iframeResizer\.contentWindow\.min\.js"></script>\s*',
        "", out,
    )

    # Logo path → data URL
    out = out.replace('src="../../assets/logo.svg"', f'src="{logo_data_url}"')

    # --- 8. compose inline CSS ------------------------------------------
    inline_css = (
        "<style>\n"
        f"{figtree_face}\n"
        f"{fonts_css}\n"
        f"{colors_css}\n"
        f"{styles_css}\n"
        "</style>"
    )
    out = out.replace("</head>", f"{inline_css}\n</head>")

    # --- 9. compose inline script ---------------------------------------
    inline_data_js = json_safe(inline_data)
    fetch_shim = """
// Intercept fetch() so the app's data-loading code (which expects to GET
// CSVs and manifest.json from disk) returns embedded data instead.
const __origFetch = (typeof window !== "undefined" && window.fetch)
    ? window.fetch.bind(window) : null;
if (typeof window !== "undefined") {
    window.fetch = (url) => {
        const data = window.__inlinedData?.[url];
        if (data !== undefined) {
            const text = typeof data === "string" ? data : JSON.stringify(data);
            return Promise.resolve({
                ok: true,
                status: 200,
                text: () => Promise.resolve(text),
                json: () => Promise.resolve(typeof data === "string" ? JSON.parse(text) : data),
            });
        }
        return __origFetch
            ? __origFetch(url)
            : Promise.reject(new Error("fetch unavailable for: " + url));
    };
}
"""

    script_body = f"""
{d3_src}
{plot_src}
// d3 / Plot UMD builds expose globals. Alias them so the stripped module
// code can reference them as locals without modification.
const Plot = window.Plot;
const d3 = window.d3;

window.__inlinedData = {inline_data_js};
window.__figtreeFontFace = {json.dumps(figtree_face)};
window.__logoDataUrl = {json.dumps(logo_data_url)};
{fetch_shim}

// === tbl-chart.js ====================================================
{tbl_chart_js}

// === charts.js =======================================================
{charts_js}

// === export-image.js =================================================
{export_image_js}

// === zip-store.js ====================================================
{zip_store_js}

// === download-all.js =================================================
{download_all_js}

// === app.js ==========================================================
{app_js}
"""
    out = out.replace("</body>", f"<script>{script_body}</script>\n</body>")

    # --- 10. header banner ----------------------------------------------
    banner = f"""<!--
  ==========================================================================
  AI Labor Market Tracker — Standalone Preview ({today})

  Generated by tools/ai-labor-market-tracker/scripts/build-standalone.py

  Self-contained: all CSS, JS, data, the Figtree font (SIL OFL), and the
  Budget Lab logo are inlined. No network connection required to view.
  ==========================================================================
-->
"""
    out = banner + out

    # --- 11. write -------------------------------------------------------
    out_path = OUT_DIR / f"ai-labor-market-tracker-preview-{today}.html"
    out_path.write_text(out, encoding="utf-8")
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"\nWrote {out_path}")
    print(f"  Size: {size_mb:.2f} MB")
    return out_path


if __name__ == "__main__":
    build()
