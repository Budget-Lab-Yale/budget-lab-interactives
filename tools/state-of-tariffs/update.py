#!/usr/bin/env python3
"""One-command update workflow for State of Tariffs.

Runs the full data-refresh pipeline against a published Tariff-Model dashboard vintage:
  1. scripts/sync-model-data.py <dashboard-dir>   archive outgoing release + copy data + model-meta
  2. scripts/reconcile-model-data.py              interim data-contract fixes
  3. scripts/build-manifest.py                     regenerate data/manifest.json

Stops on the first failure. Afterward it prints the two remaining manual steps (the editorial
changes note and the commit/PR/merge).

Run:  C:/Python314/python.exe update.py <path-to-dashboard-dir>
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent / "scripts"


def run(label: str, script: str, *args: str) -> None:
    print(f"\n=== {label} ===", flush=True)
    result = subprocess.run([sys.executable, str(SCRIPTS / script), *args])
    if result.returncode != 0:
        print(f"\nupdate: '{label}' failed (exit {result.returncode}); stopping.", file=sys.stderr)
        sys.exit(result.returncode)


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print("usage: update.py <path-to-dashboard-dir>")
        sys.exit(0 if args else 2)
    if len(args) != 1:
        print("update: expected exactly one argument (the dashboard dir)", file=sys.stderr)
        sys.exit(2)

    run("sync model data", "sync-model-data.py", args[0])
    run("reconcile model data", "reconcile-model-data.py")
    run("build manifest", "build-manifest.py")

    print(
        "\nupdate: pipeline complete. Remaining manual steps:\n"
        '  1. Update the "Changes since the last update" note for this release in\n'
        "     data/introduction/overview/config.md, then re-run: python scripts/build-manifest.py\n"
        "  2. Review the diff, commit, open a PR, and merge to publish.\n"
    )


if __name__ == "__main__":
    main()
