#!/usr/bin/env python3
"""Sync `data/data.json` (schema 3) from a fresh `atlas2_data.json` handoff artifact.

`atlas2_data.json` is fit from a Tax-Simulator run vintage (currently `toptax_v11_2026-09-28`) by
`other/top_tax/fit_surrogate.py` and validated by `other/top_tax/check_atlas2_render.js`. Its
schema (v3) is stable, so refreshing the data is just "drop the new file in": this script
validates the artifact carries the confirmed top-level contract, then copies it verbatim to
`data/data.json`. See docs/model-data-handoff.md for the full schema (source of truth: the
handoff bundle's own README.md).

This script does not re-derive the fidelity checks (that would mean reimplementing model.js's
surrogate evaluator in Python). After syncing, run the real fidelity gate from this tool's
directory:

    node --test

`test/model.test.mjs` re-checks every `meta.surrogate.checks` fixture against `model.js`.

Run:  C:/Python314/python.exe scripts/sync-model-data.py <path-to-atlas2_data.json>
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

TOOL_ROOT = Path(__file__).resolve().parent.parent
DEST = TOOL_ROOT / "data" / "data.json"

REQUIRED_TOP_LEVEL = ("meta", "etr_base", "income_levels", "surrogate")
REQUIRED_SURROGATE_KEYS = ("solo", "g", "pairs", "triples")
EXPECTED_SCHEMA = 3

# The three revenue tiers the stack view's three rungs read (first-order,
# mechanical, collected), each as a total / by-year / by-head vector, plus the
# two ETR slices, plus their dollar twins (tax/taxc) that the distribution card
# reads. A vintage missing the mechanical trio would render an empty middle bar
# rather than failing, so it is checked here.
REQUIRED_QUANTITIES = ("ct", "cy", "ch", "mt", "my", "mh", "st", "sy", "sh", "etr", "etrc", "tax", "taxc")


def fail(msg: str) -> "None":
    print(f"sync-model-data: ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def validate_contract(artifact: object) -> None:
    """Validate the confirmed atlas2_data.json (schema 3) contract described in
    docs/model-data-handoff.md. Structural only — this does not re-derive the 25
    meta.surrogate.checks fixtures; run `node --test` after syncing for that."""
    if not isinstance(artifact, dict):
        fail(f"artifact root must be a JSON object, got {type(artifact).__name__}")

    missing_top = [k for k in REQUIRED_TOP_LEVEL if k not in artifact]
    if missing_top:
        fail(f"artifact is missing top-level key(s): {missing_top}")

    meta = artifact["meta"]
    if not isinstance(meta, dict):
        fail("'meta' must be an object")

    schema = meta.get("schema")
    if schema != EXPECTED_SCHEMA:
        fail(f"meta.schema must be {EXPECTED_SCHEMA}, got {schema!r}")

    meta_surrogate = meta.get("surrogate")
    if not isinstance(meta_surrogate, dict):
        fail("artifact is missing 'meta.surrogate'")

    # The count grows with every vintage (25 at v3, 31 at v6), so this validates
    # the SHAPE of the holdout set rather than pinning a number that goes stale.
    # test/model.test.mjs runs whatever fixtures are here against model.js.
    checks = meta_surrogate.get("checks")
    if not isinstance(checks, list) or not checks:
        got = len(checks) if isinstance(checks, list) else type(checks).__name__
        fail(f"meta.surrogate.checks must be a non-empty array, got {got}")
    for i, check in enumerate(checks):
        if not isinstance(check, dict):
            fail(f"meta.surrogate.checks[{i}] must be an object")
        for field in ("conv_totals", "static_totals"):
            vals = check.get(field)
            if not isinstance(vals, list) or len(vals) != len(meta.get("decades", ())):
                fail(f"meta.surrogate.checks[{i}].{field} must have one value per decade")

    quantities = meta_surrogate.get("quantities")
    if not isinstance(quantities, list):
        fail("artifact is missing 'meta.surrogate.quantities'")
    missing_q = [q for q in REQUIRED_QUANTITIES if q not in quantities]
    if missing_q:
        fail(f"meta.surrogate.quantities is missing: {missing_q}")
    m = meta_surrogate.get("m")
    if not isinstance(m, dict):
        fail("artifact is missing 'meta.surrogate.m'")
    missing_m = [q for q in quantities if q not in m]
    if missing_m:
        fail(f"meta.surrogate.m has no vector length for: {missing_m}")

    surrogate = artifact["surrogate"]
    if not isinstance(surrogate, dict):
        fail("'surrogate' must be an object")

    missing_surrogate = [k for k in REQUIRED_SURROGATE_KEYS if k not in surrogate]
    if missing_surrogate:
        fail(f"'surrogate' is missing key(s): {missing_surrogate}")

    etr_base = artifact.get("etr_base")
    if not isinstance(etr_base, dict) or not etr_base:
        fail("artifact is missing a non-empty 'etr_base'")

    income_levels = artifact.get("income_levels")
    if not isinstance(income_levels, dict) or not income_levels:
        fail("artifact is missing a non-empty 'income_levels'")


def main() -> None:
    args = sys.argv[1:]
    if len(args) != 1:
        fail("usage: sync-model-data.py <path-to-atlas2_data.json>")

    source = Path(args[0]).resolve()
    if not source.is_file():
        fail(f"source is not a file: {source}")

    raw = source.read_text(encoding="utf-8")
    try:
        artifact = json.loads(raw)
    except json.JSONDecodeError as e:
        fail(f"{source}: invalid JSON: {e}")

    validate_contract(artifact)

    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(raw, encoding="utf-8")
    print(f"sync-model-data: wrote {DEST} from {source}")
    print("sync-model-data: now run `node --test` from this tool's directory to confirm fidelity")


if __name__ == "__main__":
    main()
