#!/usr/bin/env python3
"""Copy a Tariff-Model dashboard vintage into the tool's committed data/ tree.

The modelers (the "Johns") publish a dashboard artifact under the shared production
tree at:

    <root>/model_data/Tariff-Model/v<version>/<vintage>/dashboard/
        manifest.json
        dependencies.csv
        data/
            statutory-rates/<slug>/data.csv
            default-scenario/<slug>/data.csv
            alternative-scenarios/<slug>/data.csv

This script takes one such `dashboard/` directory and:
  1. Reads the model manifest.json (scenarios + provenance).
  2. Copies every `data/<section>/<slug>/data.csv` into this tool's `data/<section>/<slug>/`,
     mirroring the model's slug layout. Existing per-figure `config.md` files (authored in
     this repo, not shipped by the model) are left untouched — only `data.csv` is written.
  3. Emits `data/model-meta.json` — the scenario list (id/label/short_label/default) plus
     provenance — which `build-manifest.py` reads to inject scenario series/columns and to
     stamp the release block. Scenario ids/labels are thus never hand-typed in configs.

Runtime data delivery is copy-in-at-publish: run this, run build-manifest.py, commit, merge.
No cross-origin fetch — the published site stays static and same-origin.

Run:  C:/Python314/python.exe scripts/sync-model-data.py <path-to-dashboard-dir>
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Section directories copied from the model tree, in the order tabs present them.
SECTIONS = ("statutory-rates", "default-scenario", "alternative-scenarios")


def fail(msg: str) -> "None":
    print(f"sync-model-data: ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: sync-model-data.py <path-to-dashboard-dir>")
    source = Path(sys.argv[1]).resolve()
    if not source.is_dir():
        fail(f"source is not a directory: {source}")

    manifest_path = source / "manifest.json"
    if not manifest_path.exists():
        fail(f"no manifest.json in {source}")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fail(f"{manifest_path}: invalid JSON: {e}")

    scenarios = manifest.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        fail("manifest.json has no non-empty 'scenarios' array")
    defaults = [s for s in scenarios if s.get("default")]
    if len(defaults) != 1:
        fail(f"expected exactly one scenario with default:true, found {len(defaults)}")

    # Copy each section's data.csv files, mirroring the slug layout.
    src_data = source / "data"
    if not src_data.is_dir():
        fail(f"no data/ directory in {source}")

    copied = 0
    for section in SECTIONS:
        sec_dir = src_data / section
        if not sec_dir.is_dir():
            print(f"sync-model-data: WARNING: section '{section}' absent in source; skipping")
            continue
        for slug_dir in sorted(p for p in sec_dir.iterdir() if p.is_dir()):
            src_csv = slug_dir / "data.csv"
            if not src_csv.exists():
                print(f"sync-model-data: WARNING: no data.csv in {slug_dir}; skipping")
                continue
            dst_dir = DATA_DIR / section / slug_dir.name
            dst_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src_csv, dst_dir / "data.csv")
            copied += 1

    # Emit model-meta.json (scenario definitions + provenance) for build-manifest.py.
    meta = {
        "scenarios": [
            {
                "id": s["id"],
                "label": s.get("label", s["id"]),
                "short_label": s.get("short_label", s.get("label", s["id"])),
                "default": bool(s.get("default")),
            }
            for s in scenarios
        ],
        "default_scenario": defaults[0]["id"],
        "provenance": {
            "version": manifest.get("version"),
            "interface_vintage": manifest.get("interface_vintage"),
            "published_at": manifest.get("published_at"),
            "git_commit": manifest.get("git_commit"),
            "tracker_vintage": manifest.get("tracker_vintage"),
        },
    }
    (DATA_DIR / "model-meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    n_scen = len(scenarios)
    print(
        f"sync-model-data: copied {copied} data.csv files; "
        f"wrote model-meta.json ({n_scen} scenario{'s' if n_scen != 1 else ''}, "
        f"default={defaults[0]['id']}, vintage={manifest.get('interface_vintage')})"
    )


if __name__ == "__main__":
    main()
