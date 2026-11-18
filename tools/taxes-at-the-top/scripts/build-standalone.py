"""Bundle "Revenue from higher taxes at the top" into one self-contained HTML file.

Built for handing to a reviewer who should not have to run a server: open the file
and it works, offline.

Inlines:
  - CSS: the Style-Guide colour tokens, the vendored chart-engine stylesheet, and
    the tool's own styles.css
  - The vendored chart engine bundle (a classic IIFE, so it needs no treatment)
  - Every ES module, import syntax stripped and concatenated in dependency order
  - data/data.json, replacing the fetch the page normally does at boot
  - assets/logo.svg as a data URI

NOT inlined, on purpose:
  - assets/style-guide/fonts.css. It declares the licensed Mallory faces and pulls
    Source Sans from Google. This tool renders in FIGTREE (styles.css sets
    --tbl-font-sans), and Figtree arrives base64-embedded inside the vendored
    chart-engine stylesheet. So the bundle carries no proprietary font and needs no
    network — which is what makes it safe to hand to someone outside the team.
  - The iframe-resizer shim, which is only meaningful when embedded.

Usage:
  python build-standalone.py [-o OUTPUT.html]
"""

from __future__ import annotations

import argparse
import base64
import os
import re
import subprocess
import tempfile
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOOL = HERE.parent
REPO = TOOL.parent.parent
ASSETS = REPO / "assets"

# The module list is DISCOVERED from the import graph, never hand-written. A hand
# list silently omitted render/export.js and render/logo.js: `node --check` still
# passed, because a missing module is not a syntax error, and the bundle threw
# ReferenceError the first time a reviewer clicked Data or Image. Walking the graph
# from the entry point cannot make that mistake.
ENTRY = "app.js"

IMPORT_RE = re.compile(
    r"import\s+(?:\{(?P<names>[^}]*)\}|\*\s+as\s+\w+|\w+)\s+from\s+['\"](?P<path>[^'\"]+)['\"]",
    re.S,
)

CSS = [
    ASSETS / "style-guide" / "colors.css",
    TOOL / "vendor" / "chart-engine" / "chart-engine.css",
    TOOL / "styles.css",
]

DECL = re.compile(
    r"^(?:export\s+)?(?:async\s+)?(?:function|var|const|let)\s+([A-Za-z_$][\w$]*)", re.M
)


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def walk_imports(entry: str) -> tuple[list[str], set[str]]:
    """Depth-first walk of the import graph from `entry`, dependencies first.

    Returns (module paths in load order, every name imported anywhere). The second
    value is what lets the caller prove the bundle is complete: each of those names
    must end up declared, or something was left out.
    """
    order: list[str] = []
    imported: set[str] = set()
    visiting: set[str] = set()

    def visit(rel: str) -> None:
        if rel in order:
            return
        if rel in visiting:
            raise SystemExit(f"Import cycle involving {rel}; concatenation cannot express it.")
        visiting.add(rel)
        src = read(TOOL / rel)
        base = (TOOL / rel).parent
        for m in IMPORT_RE.finditer(src):
            if m.group("names"):
                for n in m.group("names").split(","):
                    n = n.strip().split(" as ")[-1].strip()
                    if n:
                        imported.add(n)
            dep = (base / m.group("path")).resolve().relative_to(TOOL).as_posix()
            visit(dep)
        visiting.discard(rel)
        order.append(rel)

    visit(entry)
    return order, imported


def assert_nothing_missing(js: str, imported: set[str]) -> None:
    """Every name any module imported must be declared in the concatenation.

    `node --check` cannot catch a missing module: an undefined identifier is valid
    syntax and only fails when the line runs — which for the download handlers means
    the first time someone clicks the button, long after the build looked clean.
    """
    declared = {m.group(1) for m in DECL.finditer(js)}
    missing = sorted(imported - declared)
    if missing:
        raise SystemExit(
            "Bundle is incomplete — these imported names are never declared:\n    "
            + ", ".join(missing)
            + "\nA module reachable from the entry point was not inlined."
        )


def strip_module_syntax(js: str) -> str:
    """ES module source -> something runnable inside one classic <script>."""
    js = re.sub(r"import\s*\{[^}]*\}\s*from\s*['\"][^'\"]+['\"];?\s*", "", js, flags=re.S)
    js = re.sub(r"import\s+\*\s+as\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*", "", js)
    js = re.sub(r"import\s+\w+\s+from\s+['\"][^'\"]+['\"];?\s*", "", js)
    js = re.sub(r"\bexport\s+async\s+function\b", "async function", js)
    js = re.sub(r"\bexport\s+function\b", "function", js)
    js = re.sub(r"\bexport\s+var\b", "var", js)
    js = re.sub(r"\bexport\s+const\b", "const", js)
    js = re.sub(r"\bexport\s+let\b", "let", js)
    js = re.sub(r"export\s*\{[^}]*\};?\s*", "", js, flags=re.S)
    # import.meta is a parse-time SyntaxError in a classic script, which would kill
    # the whole concatenated bundle rather than just its own line.
    js = re.sub(r"\bimport\.meta\.url\b", "document.baseURI", js)
    return js


def assert_no_collisions(sources: dict[str, str]) -> None:
    """Concatenation puts every module in ONE scope, so two modules declaring the
    same top-level name means the last one silently wins for both. That is a wrong
    bundle, not a failed one, so it has to be fatal rather than a warning.

    This caught a real case: render/stack.js and app.js both had `escAttr`, with
    DIFFERENT escape sets. The bundle would have quietly given stack.js app.js's
    version. app.js's is now `escapeAttr`.
    """
    seen: dict[str, list[str]] = {}
    for name, src in sources.items():
        for m in DECL.finditer(src):
            seen.setdefault(m.group(1), []).append(name)
    clashes = {k: v for k, v in seen.items() if len(v) > 1}
    if clashes:
        lines = "\n".join(f"    {k}  ->  {', '.join(v)}" for k, v in sorted(clashes.items()))
        raise SystemExit(
            "Top-level name collisions across modules; the bundle would be wrong:\n"
            + lines
            + "\n\nRename one of each pair before bundling."
        )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--output", default=None)
    args = ap.parse_args()

    html = read(TOOL / "index.html")

    # --- CSS -------------------------------------------------------------
    css = "\n\n".join(f"/* ==== {p.name} ==== */\n{read(p)}" for p in CSS)
    # styles.css @imports Figtree from Google. In the bundle that is both redundant
    # (the vendored engine sheet embeds Figtree as base64) and inert (an @import
    # sitting below other rules is dropped by every browser) — but leaving it in
    # would make the file reach the network on open, the one thing it must not do.
    css = re.sub(r"@import\s+url\([^)]*\);?\s*", "", css)

    # --- JS --------------------------------------------------------------
    modules, imported = walk_imports(ENTRY)
    sources = {m: read(TOOL / m) for m in modules}
    assert_no_collisions(sources)
    js = "\n\n".join(
        f"/* ==== {m} ==== */\n{strip_module_syntax(src)}" for m, src in sources.items()
    )
    assert_nothing_missing(js, imported)

    # The page fetches its data at boot; the bundle already has it.
    data = read(TOOL / "data" / "data.json")
    before = js
    js = js.replace(
        "fetch('./data/data.json')\n    .then(function (res) { return res.json(); })",
        "Promise.resolve(window.__TAXES_DATA)",
    )
    if js == before:
        raise SystemExit(
            "Could not find the data fetch in app.js to replace. The bundle would "
            "load forever. Update the pattern in this script."
        )

    # A syntax error anywhere in the concatenation kills the bundle silently: the
    # page renders its static shell and simply never boots. Catch it at build time.
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as fh:
        fh.write(js)
        probe = fh.name
    try:
        r = subprocess.run(["node", "--check", probe], capture_output=True, text=True)
        if r.returncode != 0:
            raise SystemExit("Bundled JS does not parse:\n" + (r.stderr or r.stdout))
    finally:
        os.unlink(probe)

    engine = read(TOOL / "vendor" / "chart-engine" / "live.js")
    logo = base64.b64encode((ASSETS / "logo.svg").read_bytes()).decode("ascii")

    # --- splice ----------------------------------------------------------
    html = re.sub(r'\s*<link rel="preconnect"[^>]*>', "", html)
    html = re.sub(r'\s*<link rel="stylesheet"[^>]*>', "", html)
    html = re.sub(r'\s*<script src="vendor/chart-engine/live\.js[^"]*"></script>', "", html)
    html = re.sub(r'\s*<script type="module" src="app\.js"></script>', "", html)
    html = re.sub(r'\s*<script src="\.\./\.\./embed/[^"]*"></script>', "", html)
    html = html.replace('src="../../assets/logo.svg"', f'src="data:image/svg+xml;base64,{logo}"')

    banner = (
        f"\n<!-- Standalone review bundle, built {date.today().isoformat()} from the "
        f"taxes-at-the-top branch. Self-contained: no network, no server. -->\n"
    )
    html = html.replace("</head>", f"<style>\n{css}\n</style>\n</head>", 1)
    html = html.replace(
        "</body>",
        "<script>window.__TAXES_DATA = " + data + ";</script>\n"
        "<script>\n" + engine + "\n</script>\n"
        "<script>\n" + js + "\n</script>\n</body>",
        1,
    )
    html = html.replace("<body>", "<body>" + banner, 1)

    out = Path(args.output) if args.output else (TOOL / "dist" / "taxes-at-the-top-standalone.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    kb = out.stat().st_size / 1024
    print(f"wrote {out}  ({kb:,.0f} KB)")
    for probe, label in [
        ("__TAXES_DATA", "data inlined"),
        ("BudgetLabChart", "chart engine inlined"),
        ("function createModel", "model inlined"),
        ("data:image/svg+xml;base64", "logo inlined"),
        ("@font-face", "Figtree embedded"),
    ]:
        print(("  ok   " if probe in html else "  MISS ") + label)
    for bad, label in [
        ('link rel="stylesheet"', "no external stylesheet"),
        ("fonts.googleapis", "no Google Fonts request"),
        ('src="app.js"', "no external script"),
        ("fetch('./data", "no data fetch"),
    ]:
        print(("  ok   " if bad not in html else "  LEAK ") + label)


if __name__ == "__main__":
    main()
