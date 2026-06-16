#!/usr/bin/env python3
"""Create a dated, citeable snapshot of the AI Labor Market Tracker.

The calculators' simple `cp *.html *.js` recipe in CONTRIBUTING.md does NOT work
for this tool. It is multi-file and has depth-sensitive references in BOTH the
HTML (index.html -> ../../assets, ../../embed) and the JS (export-image.js loads
"../../assets/logo.svg" via import.meta.url). A snapshot lives two directory
levels deeper than the canonical tool, so every reference that climbs to the
repo root must gain two extra "../" segments. check-links.mjs only scans HTML,
so a missed JS reference would 404 silently at runtime (broken PNG export) —
hence this script re-depths both HTML and JS.

Usage (run from the tool root):
    python scripts/make-snapshot.py [YYYY-MM-DD]

Defaults to today's date. Produces versions/<date>/ as a frozen, self-contained
copy served at .../tools/ai-labor-market-tracker/versions/<date>/. The tool-root
package.json ("type": "module") governs the snapshot's .js for `node --check`,
so the snapshot needs no package.json of its own.
"""
import datetime
import re
import shutil
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parent.parent          # tools/ai-labor-market-tracker

# Runtime files/dirs to freeze. Excludes build tooling (scripts/), CI hooks
# (ci/), local artifacts (dist/ + caches), package.json, .gitignore, CHANGELOG.
INCLUDE_FILES = [
    "index.html", "app.js", "charts.js", "tbl-chart.js",
    "export-image.js", "download-all.js", "zip-store.js", "styles.css",
]
INCLUDE_DIRS = ["fonts", "data", "vendor"]

# Root-climbing prefixes valid at canonical depth (2) but wrong at snapshot
# depth (4). Re-depth by adding two more "../" segments.
REDEPTH = {
    "../../assets/": "../../../../assets/",
    "../../embed/": "../../../../embed/",
}
REWRITE_EXT = {".html", ".js", ".css"}


def main():
    date = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
    datetime.date.fromisoformat(date)  # validate YYYY-MM-DD

    dest = TOOL / "versions" / date
    if dest.exists():
        sys.exit(f"refusing to overwrite existing snapshot: {dest}")
    dest.mkdir(parents=True)

    for name in INCLUDE_FILES:
        shutil.copy2(TOOL / name, dest / name)
    for name in INCLUDE_DIRS:
        shutil.copytree(TOOL / name, dest / name)

    rewritten = 0
    for p in dest.rglob("*"):
        if not (p.is_file() and p.suffix.lower() in REWRITE_EXT):
            continue
        text = p.read_text(encoding="utf-8")
        new = text
        for old, repl in REDEPTH.items():
            new = new.replace(old, repl)
        # Safety net: any remaining run of exactly two "../" climbs to the
        # canonical-depth root and was probably missed by REDEPTH.
        for run in re.findall(r"(?:\.\./)+", new):
            if run.count("../") == 2:
                print(f"  WARNING: possible un-re-depthed root ref in "
                      f"{p.relative_to(dest)} (run '{run}')")
                break
        if new != text:
            p.write_text(new, encoding="utf-8")
            rewritten += 1

    print(f"Snapshot created: versions/{date}  ({rewritten} files re-depthed)")


if __name__ == "__main__":
    main()
