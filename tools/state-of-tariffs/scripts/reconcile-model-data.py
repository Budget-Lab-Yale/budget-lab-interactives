#!/usr/bin/env python3
"""Reconcile a synced Tariff-Model artifact to the dashboard's data contract.

INTERIM STOPGAP. Run AFTER scripts/sync-model-data.py and BEFORE build-manifest.py:

    python scripts/sync-model-data.py <dashboard-dir>
    python scripts/reconcile-model-data.py
    python scripts/build-manifest.py

As of vintage 202607131919 the model output diverges from the contract the dashboard
renders against (see docs/model-data-handoff.md § "Known divergences"). Each fix below
should ultimately move upstream into the model output; until then this script applies them.
Every step is idempotent — safe to re-run, a no-op once the artifact already conforms.

  1. gdp-by-category — derive the `group` faceting column (model drops it) from
     dimension + category_code, and drop the redundant "World ex USA" aggregate row
     (it double-counts the mutually-exclusive trading-partner groups).
  2. distribution   — merge the split `distribution-pct-income` / `distribution-dollars`
     files into one consolidated `distribution/data.csv` with a `basis` column, then remove
     the split dirs.
  3. summary-statistics — drop the Unemployment rate row (not shown on the dashboard).
  4. statutory-rates — remove the superseded `daily-rate-by-category` (GTAP) figure; By
     Product now renders `daily-rate-by-hs`.
"""
from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SCENARIO_TABS = ("default-scenario", "alternative-scenarios")
MFG_DETAIL = {"durable", "nondurable", "advanced"}
DIST_SPLIT = (("distribution-pct-income", "% of after-tax income"),
              ("distribution-dollars", "2025 dollars"))


def read_rows(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        return list(r), list(r.fieldnames or [])


def write_rows(path: Path, rows, fieldnames):
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def group_for(dimension: str, code: str) -> str:
    if code in MFG_DETAIL:
        return "Manufacturing detail"
    return "Sectors" if dimension == "sector" else "Trading partners"


def reconcile_gdp(tab: str) -> None:
    p = DATA_DIR / tab / "gdp-by-category" / "data.csv"
    if not p.exists():
        return
    rows, fn = read_rows(p)
    if not rows or "category_code" not in fn:
        return
    # Drop the "World ex USA" aggregate. Every other trading-partner category is a mutually
    # exclusive group; "World ex USA" sums the non-USA partners on top of them, so it double-
    # counts and doesn't belong in the same bar set.
    before = len(rows)
    rows = [r for r in rows if r.get("category") != "World ex USA"]
    dropped = before - len(rows)
    for row in rows:
        row["group"] = group_for(row["dimension"], row["category_code"])
    if "group" not in fn:
        fn.append("group")
    write_rows(p, rows, fn)
    note = f"; dropped {dropped} World-ex-USA row(s)" if dropped else ""
    print(f"  {tab}/gdp-by-category: +group ({len(rows)} rows){note}")


def reconcile_distribution(tab: str) -> None:
    out_dir = DATA_DIR / tab / "distribution"
    merged, base_fn = [], None
    present = [(s, b) for s, b in DIST_SPLIT if (DATA_DIR / tab / s / "data.csv").exists()]
    if not present:
        return  # already consolidated (idempotent)
    for slug, basis in present:
        rows, fn = read_rows(DATA_DIR / tab / slug / "data.csv")
        if base_fn is None:
            base_fn = fn
        for row in rows:
            row["basis"] = basis
            merged.append(row)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_rows(out_dir / "data.csv", merged, base_fn + ["basis"])
    for slug, _ in present:
        shutil.rmtree(DATA_DIR / tab / slug)
    print(f"  {tab}/distribution: merged {len(merged)} rows; removed split dirs")


def drop_unemployment(tab: str) -> None:
    p = DATA_DIR / tab / "summary-statistics" / "data.csv"
    if not p.exists():
        return
    rows, fn = read_rows(p)
    kept = [r for r in rows if r.get("category") != "Unemployment rate"]
    # Table row groups follow first appearance in the CSV. Keep fiscal results last so the
    # summary table mirrors the dashboard sidebar's rates -> prices -> GDP -> revenue order.
    non_revenue = [r for r in kept if r.get("category") != "Revenue (10-year)"]
    revenue = [r for r in kept if r.get("category") == "Revenue (10-year)"]
    ordered = non_revenue + revenue
    if ordered != rows:
        write_rows(p, ordered, fn)
        dropped = len(rows) - len(kept)
        note = f"; dropped {dropped} unemployment row(s)" if dropped else ""
        print(f"  {tab}/summary-statistics: revenue last{note}")


def remove_superseded_by_category() -> None:
    d = DATA_DIR / "statutory-rates" / "daily-rate-by-category"
    if d.exists():
        shutil.rmtree(d)
        print("  statutory-rates/daily-rate-by-category: removed (superseded by daily-rate-by-hs)")


def main() -> None:
    print("reconcile-model-data:")
    for tab in SCENARIO_TABS:
        reconcile_gdp(tab)
        reconcile_distribution(tab)
        drop_unemployment(tab)
    remove_superseded_by_category()
    print("reconcile-model-data: done")


if __name__ == "__main__":
    main()
