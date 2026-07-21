#!/usr/bin/env python3
"""Copy a Tariff-Model dashboard vintage into the tool's committed data/ tree.

Given a published `dashboard/` dir (manifest.json + data/<section>/<slug>/data.csv), this:
  1. Archives the outgoing release first (see archive_current), so a sync never destroys the
     previous report; idempotent.
  2. Copies each data.csv into data/<section>/<slug>/ (per-figure config.md is left untouched).
  3. Writes data/model-meta.json (scenarios + provenance) for build-manifest.py.

Run:  C:/Python314/python.exe scripts/sync-model-data.py <path-to-dashboard-dir>
      C:/Python314/python.exe scripts/sync-model-data.py --archive-only   # archive current, no sync
"""

from __future__ import annotations

import copy
import json
import re
import shutil
import sys
from datetime import date as _date
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Section directories copied from the model tree, in the order tabs present them.
SECTIONS = ("statutory-rates", "default-scenario", "alternative-scenarios")

# The report tabs archived as a browsable "vintage" (Daily Statutory Rates, Introduction, and
# Methodology are intentionally not archived). This is the only place the specific scenario tabs
# are named; the archive layout and the app treat a vintage's scenarios as a generic list.
ARCHIVE_SECTIONS = ("default-scenario", "alternative-scenarios")


def fail(msg: str) -> "None":
    print(f"sync-model-data: ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


# --- Vintage archiving -----------------------------------------------------
# Freeze the currently-committed release before a sync overwrites it, into a dated folder
# data/previous-vintages/<date>/ holding a vintage.json + the copied CSVs. vintage.json carries a
# generic `scenarios` list — [{id, label, tab}] — so nothing downstream hard-codes which report
# scenarios exist. Each `tab` is the *compiled* manifest tab object (labels, toggles, scenario
# roles, colors baked in) so an archived vintage renders exactly as it did, never re-derived from a
# later config.md; CSV paths in it are rewritten to point under the vintage dir.


def format_vintage_label(published_at: str, date_str: str) -> str:
    """`2026-07-16T11:02:00-0400` → `July 16, 2026` (date part only, tz-agnostic)."""
    try:
        d = _date.fromisoformat((published_at or date_str)[:10])
    except (ValueError, TypeError):
        return date_str
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def _copy_csv_into_vintage(rel_path: str, dest: Path, folder: str) -> str:
    """Copy data/<rel_path> into the vintage dir and return the rewritten manifest-relative path."""
    src = DATA_DIR / rel_path
    dst = dest / rel_path
    if src.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
    else:
        print(f"sync-model-data: WARNING: archive source CSV missing: {src}")
    return f"previous-vintages/{folder}/{rel_path}"


def _archive_figure_csvs(fig: dict, dest: Path, folder: str) -> None:
    """Copy + rewrite every CSV path a figure references (plain data, composite parts, prose
    tables), in place on the deep-copied figure object."""
    if isinstance(fig.get("data"), str):
        fig["data"] = _copy_csv_into_vintage(fig["data"], dest, folder)
    for part in fig.get("parts") or []:
        if isinstance(part.get("data"), str):
            part["data"] = _copy_csv_into_vintage(part["data"], dest, folder)
    for tdef in (fig.get("tables") or {}).values():
        if isinstance(tdef.get("data"), str):
            tdef["data"] = _copy_csv_into_vintage(tdef["data"], dest, folder)


def _extract_changes_html(manifest: dict, label: str) -> "str | None":
    """Pull the "Changes since the last update" prose card out of the Introduction overview and
    retitle it "Changes for the <label> Update" for the archived vintage's summary page."""
    intro = next((t for t in manifest.get("tabs", []) if t.get("id") == "introduction"), None)
    overview = next((f for f in (intro or {}).get("figures", []) if f.get("id") == "overview"), None)
    for block in (overview or {}).get("blocks", []):
        if block.get("type") == "text" and "Changes since the last update" in (block.get("html") or ""):
            return re.sub(
                r"<h2>\s*Changes since the last update\s*</h2>",
                f"<h2>Changes for the {label} Update</h2>",
                block["html"],
                count=1,
            )
    return None


def _scenario_label(tab: dict) -> str:
    """A clean dropdown label from a report tab. Tab labels read "Projected Effects:\\nDefault
    Scenario"; use the part after the newline ("Default Scenario")."""
    label = tab.get("label") or tab.get("id", "")
    return label.split("\n")[-1].strip() if "\n" in label else label


def archive_current() -> "str | None":
    """Snapshot the currently-committed release into data/previous-vintages/<date>/. Reads the
    committed model-meta.json (outgoing provenance) + manifest.json (outgoing compiled tabs).
    Idempotent: skips if that vintage is already archived. Returns the vintage date, or None if
    there is nothing to archive (first run)."""
    meta_path = DATA_DIR / "model-meta.json"
    manifest_path = DATA_DIR / "manifest.json"
    if not meta_path.exists() or not manifest_path.exists():
        print("sync-model-data: no committed model-meta.json/manifest.json yet; nothing to archive")
        return None

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    prov = meta.get("provenance") or {}
    published_at = prov.get("published_at") or ""
    date_str = published_at[:10] if published_at else ""
    # Folder key is the unique interface_vintage, NOT the bare date — so two genuine releases on
    # the same calendar day each get their own archive rather than colliding on one date slot.
    vintage_id = prov.get("interface_vintage") or date_str
    if not vintage_id:
        print("sync-model-data: WARNING: no provenance.interface_vintage/published_at; skipping archive")
        return None

    dest = DATA_DIR / "previous-vintages" / vintage_id
    if dest.exists():
        print(f"sync-model-data: vintage {vintage_id} already archived; skipping")
        return vintage_id

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    tabs_by_id = {t.get("id"): t for t in manifest.get("tabs", [])}
    label = format_vintage_label(published_at, date_str)

    scenarios: list = []
    for section in ARCHIVE_SECTIONS:
        tab = tabs_by_id.get(section)
        if not tab:
            print(f"sync-model-data: WARNING: tab '{section}' absent in manifest; skipping")
            continue
        tab = copy.deepcopy(tab)
        for fig in tab.get("figures", []):
            _archive_figure_csvs(fig, dest, vintage_id)
        scenarios.append({"id": section, "label": _scenario_label(tab), "tab": tab})

    if not scenarios:
        print("sync-model-data: WARNING: no scenario tabs found to archive")
        return None

    vintage = {
        "id": vintage_id,
        "date": date_str,
        "label": label,  # date only; build-manifest.py adds the time when a date has >1 vintage
        "published_at": published_at,
        "version": (manifest.get("release") or {}).get("version"),
        "changes_html": _extract_changes_html(manifest, label),
        "scenarios": scenarios,
    }
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "vintage.json").write_text(
        json.dumps(vintage, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"sync-model-data: archived vintage {vintage_id} ({label}); {len(scenarios)} scenario tab(s)")
    return vintage_id


def main() -> None:
    args = sys.argv[1:]
    if "--archive-only" in args:
        if len(args) != 1:
            fail("--archive-only takes no other arguments")
        archive_current()
        return

    if len(args) != 1:
        fail("usage: sync-model-data.py <path-to-dashboard-dir> | --archive-only")
    source = Path(args[0]).resolve()
    if not source.is_dir():
        fail(f"source is not a directory: {source}")

    # Freeze the outgoing release before its data is overwritten.
    archive_current()

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
