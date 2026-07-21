#!/usr/bin/env python3
"""Assemble data/manifest.json from tracker.yaml + per-figure config.md.

State of Tariffs mirrors the AI Labor Market Tracker's manifest pipeline, but each
figure's `spec` is an engine-native ChartSpec / TableSpec (rendered at runtime by the
vendored chart engine via render.js), not a tracker-specific chart block.

Inputs (under tools/state-of-tariffs/data/):
  tracker.yaml                      release + tab / section / figure / toggle definitions
  <tab>/<figure-slug>/config.md     YAML frontmatter (figure spec) + markdown body
  <tab>/<figure-slug>/data.csv      long-format data

Output:
  data/manifest.json                single runtime source of truth for app.js / render.js

config.md frontmatter schema:
  short_label : str   (required)  sidebar label
  figureType  : "chart" | "table" (default "chart")
  data        : str               CSV filename in the figure folder (default "data.csv")
  spec        : mapping (required) engine ChartSpec / TableSpec, emitted verbatim
  variants    : [ {id, label?, spec?} ]                       optional; filtered on CSV `variant`
  selectors   : [ {id, label?, kind, default, options:[{id,label}]} ]  optional sidebar dropdowns
  (body)      -> body_html (python-markdown, "extra")

Model-driven augmentation flags (translate the modelers' long-format conventions into
engine spec keys from model-meta.json, so vintage-specific values aren't hand-copied):
  auto_format: units   (table)  generate row_labels (from `series`) + format.rows (from
                                the `unit` column), keyed by the last stub column value.
  project_band: true   (chart)  shade the `projected == 1` date range as an annotations band
                                (label via `project_band_label`).
  scenario_role: series|header|selector  inject scenario ordering + id->label mapping from
                                model-meta (default scenario first): series_order/series_labels
                                for a chart, column_order/header_labels for a table, or a
                                generated sidebar scenario dropdown (default preselected).

A "prose" pane (figureType: prose) is a text-only nav item (not numbered) that renders an
ordered list of cards: a new TEXT card starts at each `##` heading, and a TABLE card is placed
wherever a `{{table: <id>}}` directive appears on its own line — so tables can sit before,
between, or after any text. Its frontmatter is:
  short_label : str (required)
  figureType  : prose
  tables      : { <id>: { spec: <TableSpec incl. data: file.csv> } }   tables refer-able from body
  (body)      -> text/table card sequence

Run:  C:/Python314/python.exe scripts/build-manifest.py
"""

from __future__ import annotations

import csv
import html
import json
import re
import sys
from pathlib import Path

import markdown
import yaml

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TRACKER = DATA_DIR / "tracker.yaml"
MODEL_META = DATA_DIR / "model-meta.json"
OUT = DATA_DIR / "manifest.json"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)


def fail(msg: str) -> "None":
    print(f"build-manifest: ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


# Release metadata (set in main()); used to resolve {date: ...} tokens in prose bodies.
RELEASE: dict = {}

# Model-run metadata from sync-model-data.py (set in main()): scenario definitions +
# provenance. Empty until a vintage has been synced.
SCENARIOS: list = []           # [{id, label, short_label, default}]
DEFAULT_SCENARIO: "str | None" = None
# Optional scenario-id -> color map from tracker.yaml (`scenario_colors:`). Overrides the
# positional palette below so a scenario keeps a chosen color across every figure. Keyed by the
# (vintage-dated) scenario id, so it's re-checked each release.
SCENARIO_COLORS: dict = {}

# The engine's categorical palette, in slot order (see chart-engine palette.ts / theme tokens).
# Used to pin scenario series to explicit, stable colors matching the engine's implicit order.
SERIES_PALETTE = ["blue", "amber", "violet", "green", "red", "rose", "russet"]

_DATE_TOKEN_BLOCK = re.compile(r"<p>\s*\{date:\s*([^}]+?)\s*\}\s*</p>")
_DATE_TOKEN_INLINE = re.compile(r"\{date:\s*([^}]+?)\s*\}")


def _resolve_date_token(value: str) -> str:
    """`{date: updated}` → release.updated; a spelled-out literal renders as-is; a bare
    lowercase keyword that isn't recognized is almost certainly a typo → error."""
    if value == "updated":
        return str(RELEASE.get("updated", ""))
    if re.fullmatch(r"[a-z][a-z0-9_]*", value):
        fail(f"unknown date keyword {value!r}. Recognized: 'updated'. For a literal date, "
             f"spell it out, e.g. {{date: January 1, 1900}}.")
    return value


def substitute_date_tokens(rendered_html: str) -> str:
    # Standalone token (its own paragraph) → styled date block; inline token → plain text.
    out = _DATE_TOKEN_BLOCK.sub(
        lambda m: '<p class="current-update-date">' + html.escape(_resolve_date_token(m.group(1))) + "</p>",
        rendered_html,
    )
    return _DATE_TOKEN_INLINE.sub(lambda m: html.escape(_resolve_date_token(m.group(1))), out)


def render_markdown(body: str) -> str:
    if not body.strip():
        return ""
    return substitute_date_tokens(markdown.markdown(body.strip(), extensions=["extra"]))


def parse_config_md(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(text)
    if not m:
        fail(f"{path}: missing YAML frontmatter delimiters (--- ... ---)")
    try:
        front = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        fail(f"{path}: invalid YAML frontmatter: {e}")
    return front, m.group(2)


# A prose pane places table cards inline via a directive on its own line:  {{table: <id>}}
TABLE_DIRECTIVE_RE = re.compile(r"^\s*\{\{\s*table:\s*([\w-]+)\s*\}\}\s*$")


def parse_prose_blocks(body: str) -> tuple[list[dict], list[str]]:
    """Split a prose body into an ordered list of cards. A new text card starts at each
    `## ` heading; a `{{table: id}}` line emits a table card at that position. Returns
    (blocks, referenced_table_ids)."""
    blocks: list[dict] = []
    referenced: list[str] = []
    buf: list[str] = []

    def flush_text() -> None:
        text = "\n".join(buf).strip()
        if text:
            blocks.append({"type": "text", "html": render_markdown(text)})
        buf.clear()

    for line in body.splitlines():
        m = TABLE_DIRECTIVE_RE.match(line)
        if m:
            flush_text()
            blocks.append({"type": "table", "table": m.group(1)})
            referenced.append(m.group(1))
        elif line.lstrip().startswith("## "):
            flush_text()
            buf.append(line)
        else:
            buf.append(line)
    flush_text()
    return blocks, referenced


def build_prose_tables(config: "Path", folder: "Path", tab_id: str, fig_id: str) -> dict:
    """Compile the frontmatter `tables:` map into {id: {spec, data}} with resolved data paths."""
    front, _ = parse_config_md(config)
    tables_front = front.get("tables") or {}
    if not isinstance(tables_front, dict):
        fail(f"{config}: 'tables' must be a mapping of id -> {{spec, ...}}")
    out: dict = {}
    for tid, tdef in tables_front.items():
        spec = (tdef or {}).get("spec")
        if not isinstance(spec, dict):
            fail(f"{config}: table '{tid}' needs a 'spec' mapping")
        if not all(k in spec for k in ("stub", "header", "value")):
            fail(f"{config}: table '{tid}' spec must set 'stub', 'header', and 'value'")
        data_name = spec.get("data", "data.csv")
        if not isinstance(data_name, str):
            fail(f"{config}: table '{tid}' supports only a simple 'spec.data: <filename>'")
        if not (folder / data_name).exists():
            fail(f"{config}: table '{tid}' data file not found ({folder / data_name})")
        # Prose-embedded tables opt into the same model-driven augmentation as standalone table
        # figures (auto_format: units, scenario_role) via keys on the table def.
        augment_spec(spec, tdef or {}, folder, config, "table")
        out[tid] = {"spec": spec, "data": f"{tab_id}/{fig_id}/{data_name}"}
    return out


def csv_x_range(data_path: Path, x_col: str) -> "tuple[str, str] | None":
    """Min/max of the x column in a CSV (ISO date / numeric strings sort correctly)."""
    try:
        with data_path.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            xs = [row[x_col] for row in reader if row.get(x_col)]
    except (OSError, KeyError):
        return None
    return (min(xs), max(xs)) if xs else None


def apply_events(spec: dict, front: dict, tab_id: str, fig_id: str, config: Path) -> None:
    """`events: <name>` (or a list of names) pulls shared annotations from the tab's
    events.yaml into spec.annotations. A named group is either a flat list (xAxis reference
    lines) or a mapping with `xAxis` and/or `bands`. xAxis lines are filtered to the figure's
    data date range; bands are passed through (the engine clamps to the domain)."""
    names = front.get("events")
    if not names:
        return
    if isinstance(names, str):
        names = [names]
    events_file = DATA_DIR / tab_id / "events.yaml"
    if not events_file.exists():
        fail(f"{config}: events: {names} but {events_file} not found")
    catalog = load_yaml(events_file) or {}

    xaxis: list = []
    bands: list = []
    for name in names:
        group = catalog.get(name)
        if group is None:
            fail(f"{config}: events group '{name}' not found in {events_file}")
        if isinstance(group, list):
            xaxis += group
        elif isinstance(group, dict):
            xaxis += group.get("xAxis", [])
            bands += group.get("bands", [])
        else:
            fail(f"{config}: events group '{name}' must be a list or mapping")

    # Resolve the `today`/`build` keyword (in a band start/end or an xAxis x) to the build date,
    # so a projection band can begin on whatever day the manifest is generated. Done before the
    # date-range filter below so resolved marker dates are filtered correctly.
    from datetime import date
    build_day = date.today().isoformat()

    def resolve_build_date(value):
        return build_day if value in ("today", "build") else value

    for entry in xaxis:
        if "x" in entry:
            entry["x"] = resolve_build_date(entry["x"])
    for band in bands:
        if "start" in band:
            band["start"] = resolve_build_date(band["start"])
        if "end" in band:
            band["end"] = resolve_build_date(band["end"])

    x_col = (spec.get("columns") or {}).get("x", "time")
    rng = csv_x_range(DATA_DIR / tab_id / fig_id / spec.get("data", "data.csv"), x_col)
    if rng:
        lo, hi = rng
        xaxis = [e for e in xaxis if lo <= str(e.get("x", "")) <= hi]

    if not xaxis and not bands:
        return
    ann = spec.setdefault("annotations", {})
    if xaxis:
        ann["xAxis"] = ann.get("xAxis", []) + xaxis
    if bands:
        ann["bands"] = ann.get("bands", []) + bands


def load_yaml(path: Path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def read_csv_rows(path: Path) -> "list[dict]":
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


# --- Model-driven spec augmentation ---------------------------------------
# These translate the modelers' long-format conventions (a per-row `unit` column, a
# `projected` 0/1 flag, an id-keyed `scenario` column) into engine-native spec keys, so
# figure authors declare intent with a small flag instead of hand-copying values that
# change per vintage.

# Map the model's `unit` values to engine FormatRules. Values arrive already scaled
# (pct is a percentage, usd_bn is in billions), so `pct`/`pp` are plain numbers with a
# suffix — NOT the engine `percent` type, which would multiply by 100 again.
UNIT_FORMATS = {
    "pct": {"type": "number", "decimals": 1, "suffix": "%"},
    "pp": {"type": "number", "decimals": 2, "suffix": " pp"},
    "usd": {"type": "currency", "decimals": 0, "prefix": "$", "thousands": True},
    "usd_bn": {"type": "currency", "decimals": 1, "prefix": "$", "suffix": "B", "thousands": True},
}


def stub_col(entry) -> str:
    """Underlying CSV column for a stub entry (`"col"` or `{label: "col"}`)."""
    return entry["label"] if isinstance(entry, dict) else entry


def apply_unit_format(spec: dict, folder: Path, config: Path) -> None:
    """`auto_format: units` — generate engine number formats from the `unit` column, keyed off
    the tidy stub so row/group LABELS stay data-driven (the stub column values are the labels;
    no row_labels remapping). Per-group format (keyed by the first stub column, e.g. `category`)
    covers each uniform-unit group; a per-row override (keyed by the last stub column, e.g.
    `series`) handles any row whose unit diverges from its group's."""
    from collections import Counter
    stub = spec["stub"]
    group_col = stub_col(stub[0])
    row_col = stub_col(stub[-1])
    rows = read_csv_rows(folder / spec.get("data", "data.csv"))

    def fmt_for(unit: str) -> dict:
        if unit not in UNIT_FORMATS:
            fail(f"{config}: unknown unit '{unit}' (known: {', '.join(UNIT_FORMATS)})")
        return dict(UNIT_FORMATS[unit])

    group_units: "dict[str, Counter]" = {}
    for r in rows:
        u = r.get("unit")
        if u:
            group_units.setdefault(r.get(group_col, ""), Counter())[u] += 1
    main_unit = {g: c.most_common(1)[0][0] for g, c in group_units.items()}

    fmt = spec.setdefault("format", {})
    fmt_groups = dict(fmt.get("groups") or {})
    fmt_rows = dict(fmt.get("rows") or {})
    for g, unit in main_unit.items():
        fmt_groups.setdefault(g, fmt_for(unit))
    # Rows whose unit differs from their group's dominant unit (e.g. Real GDP "Long-run" is a
    # percent among percentage-point rows) get a per-row override.
    for r in rows:
        u, g, rk = r.get("unit"), r.get(group_col, ""), r.get(row_col)
        if u and rk and u != main_unit.get(g) and rk not in fmt_rows:
            fmt_rows[rk] = fmt_for(u)
    if fmt_groups:
        fmt["groups"] = fmt_groups
    if fmt_rows:
        fmt["rows"] = fmt_rows


def _contiguous_date_runs(dates: "list[str]") -> "list[tuple[str, str]]":
    """Group sorted ISO dates into (start, end) runs of consecutive calendar days."""
    from datetime import date, timedelta
    runs: list[tuple[str, str]] = []
    start = prev = None
    for s in dates:
        try:
            d = date.fromisoformat(s)
        except ValueError:
            continue
        if prev is None:
            start = prev_s = s; prev = d
        elif d - prev == timedelta(days=1):
            prev = d; prev_s = s
        else:
            runs.append((start, prev_s)); start = prev_s = s; prev = d
    if start is not None:
        runs.append((start, prev_s))
    return runs


def apply_project_band(spec: dict, folder: Path, config: Path, front: dict) -> None:
    """`project_band: true` — shade projected dates. The model flags projected days with
    `projected == 1`; these come in several disjoint runs (short mid-series stretches plus a
    trailing future range), so emit one band per contiguous run. Only the trailing run (the one
    reaching the data's last date) gets the label, to avoid clutter. Uses the default scenario's
    projected pattern when a `scenario` column is present (bands are static, not per-selector)."""
    rows = read_csv_rows(folder / spec.get("data", "data.csv"))
    x_col = (spec.get("columns") or {}).get("x", "time")
    if DEFAULT_SCENARIO and rows and "scenario" in rows[0]:
        rows = [r for r in rows if r.get("scenario") == DEFAULT_SCENARIO]
    dates = sorted({r[x_col] for r in rows if str(r.get("projected", "")).strip() == "1" and r.get(x_col)})
    if not dates:
        return
    runs = _contiguous_date_runs(dates)
    last_date = max((r[x_col] for r in rows if r.get(x_col)), default=None)
    label = front.get("project_band_label", "Projected")
    ann = spec.setdefault("annotations", {})
    bands = ann.get("bands", [])
    for start, end in runs:
        band = {"start": start, "end": end}
        if label and end == last_date:
            band["label"] = label
        bands.append(band)
    ann["bands"] = bands


def scenarios_default_first() -> "list[dict]":
    return sorted(SCENARIOS, key=lambda s: (not s.get("default"),))  # default first, else stable


def scenario_labels() -> "dict":
    return {s["id"]: s.get("short_label") or s.get("label") or s["id"] for s in SCENARIOS}


def apply_scenario_dimension(spec: dict, front: dict, config: Path) -> None:
    """`scenario_role: series|header` — inject scenario ordering + id→label mapping from
    model-meta.json (default scenario first), so configs never hard-code scenario ids/labels.
    `series` targets a chart's series legend; `header`/`stub` a table's scenario column/row tier.
    (`scenario_role: selector` is handled in build_figure, which owns the selectors list.)"""
    role = front.get("scenario_role")
    if role in (None, "selector"):
        return
    if not SCENARIOS:
        fail(f"{config}: scenario_role set but no model-meta.json scenarios (run sync-model-data.py)")
    if role not in ("series", "header", "stub"):
        fail(f"{config}: scenario_role must be 'series', 'header', 'stub', or 'selector', got '{role}'")
    ordered = scenarios_default_first()
    ids = [s["id"] for s in ordered]
    labels = scenario_labels()
    if role == "series":
        spec.setdefault("series_order", ids)
        spec["series_labels"] = {**labels, **(spec.get("series_labels") or {})}
        # Pin each scenario to its palette color (default-first order) so the mapping is explicit
        # and stable — matches the engine's implicit assignment (no visual change) but lets the
        # render layer reuse the color, e.g. for per-scenario total reference lines.
        pinned = {sid: SCENARIO_COLORS.get(sid, SERIES_PALETTE[i % len(SERIES_PALETTE)])
                  for i, sid in enumerate(ids)}
        spec["series_colors"] = {**pinned, **(spec.get("series_colors") or {})}
    elif role == "header":
        spec.setdefault("column_order", ids)
        spec["header_labels"] = {**labels, **(spec.get("header_labels") or {})}
    else:  # stub — scenarios on table rows. No row_order (a global sort would break multi-level
           # stub grouping); the data already orders the default scenario first within each group.
           # Set both row_labels and group_labels so the mapping applies whether scenario is the
           # last stub tier (a row) or an earlier tier (a group header).
        spec["row_labels"] = {**labels, **(spec.get("row_labels") or {})}
        spec["group_labels"] = {**labels, **(spec.get("group_labels") or {})}


def scenario_selector() -> dict:
    """A sidebar scenario dropdown generated from model-meta (default option preselected)."""
    if not SCENARIOS:
        fail("scenario_role: selector set but no model-meta.json scenarios (run sync-model-data.py)")
    return {
        "id": "scenario",
        "label": "Scenario",
        "default": DEFAULT_SCENARIO,
        "options": [
            {"id": s["id"], "label": s.get("short_label") or s.get("label") or s["id"]}
            for s in scenarios_default_first()
        ],
    }


def augment_spec(spec: dict, front: dict, folder: Path, config: Path, figure_type: str) -> None:
    """Apply the model-driven spec augmentations opted into via figure frontmatter flags."""
    if front.get("auto_format") == "units":
        if figure_type != "table":
            fail(f"{config}: auto_format: units is only valid on a table figure")
        apply_unit_format(spec, folder, config)
    if figure_type == "chart" and front.get("project_band"):
        apply_project_band(spec, folder, config, front)
    apply_scenario_dimension(spec, front, config)


def build_part(part: dict, folder: Path, tab_id: str, fig_id: str, config: Path) -> dict:
    """Build one part of a composite figure. A part is a mini-figure: its own figureType + engine
    spec + (optional) total, sharing the parent figure's data folder, selectors, and
    tab toggles. Model augmentations (auto_format, project_band, scenario_role) are read from the
    part's own frontmatter keys, so each part can shape rows independently."""
    if not isinstance(part, dict):
        fail(f"{config}: each item in 'parts' must be a mapping")
    pf_type = part.get("figureType", "chart")
    if pf_type not in ("chart", "table"):
        fail(f"{config}: part figureType must be 'chart' or 'table', got '{pf_type}'")
    spec = part.get("spec")
    if not isinstance(spec, dict):
        fail(f"{config}: each part needs a 'spec' (mapping)")
    if pf_type == "chart" and "chartType" not in spec:
        fail(f"{config}: chart part spec must set 'chartType'")
    if pf_type == "table" and not all(k in spec for k in ("stub", "header", "value")):
        fail(f"{config}: table part spec must set 'stub', 'header', and 'value'")
    data_name = spec.get("data", "data.csv")
    if not isinstance(data_name, str):
        fail(f"{config}: only a simple 'spec.data: <filename>' is supported")
    if not (folder / data_name).exists():
        fail(f"{config}: part data file not found ({folder / data_name})")
    if pf_type == "chart":
        apply_events(spec, part, tab_id, fig_id, config)
    augment_spec(spec, part, folder, config, pf_type)
    out = {
        "figureType": pf_type,
        "data": f"{tab_id}/{fig_id}/{data_name}",
        "spec": spec,
    }
    if "total" in part:
        out["total"] = part["total"]
    return out


def build_figure(tab_id: str, fig_id: str, section_id: "str | None") -> dict:
    folder = DATA_DIR / tab_id / fig_id
    config = folder / "config.md"
    if not config.exists():
        fail(f"missing config.md for figure '{fig_id}' (expected {config})")

    front, body = parse_config_md(config)

    short_label = front.get("short_label")
    if not short_label:
        fail(f"{config}: 'short_label' is required")

    figure_type = front.get("figureType", "chart")
    if figure_type not in ("chart", "table", "prose"):
        fail(f"{config}: figureType must be 'chart', 'table', or 'prose', got '{figure_type}'")

    # Prose pane: an ordered sequence of text cards (split at each `##`) and inline table cards.
    if figure_type == "prose":
        blocks, referenced = parse_prose_blocks(body)
        tables = build_prose_tables(config, folder, tab_id, fig_id)
        for tid in referenced:
            if tid not in tables:
                fail(f"{config}: body references table '{{{{table: {tid}}}}}' not defined under 'tables'")
        figure = {
            "id": fig_id,
            "short_label": short_label,
            "figureType": "prose",
            "blocks": blocks,
            "tables": tables,
        }
        if section_id:
            figure["section"] = section_id
        return figure

    # Composite figure: a `parts` list renders multiple engine mounts (e.g. a table then a chart)
    # stacked in one figure pane, sharing the figure's data folder, selectors, and tab toggles.
    if "parts" in front:
        parts = front["parts"]
        if not isinstance(parts, list) or not parts:
            fail(f"{config}: 'parts' must be a non-empty list")
        figure = {
            "id": fig_id,
            "short_label": short_label,
            "figureType": "composite",
            "parts": [build_part(p, folder, tab_id, fig_id, config) for p in parts],
            "body_html": render_markdown(body),
        }
    else:
        spec = front.get("spec")
        if not isinstance(spec, dict):
            fail(f"{config}: 'spec' (mapping) is required")
        if figure_type == "chart" and "chartType" not in spec:
            fail(f"{config}: chart spec must set 'chartType'")
        if figure_type == "table" and not all(k in spec for k in ("stub", "header", "value")):
            fail(f"{config}: table spec must set 'stub', 'header', and 'value'")

        # Data lives in the engine spec (`spec.data`), the engine-native authoring form. The runtime
        # mount ignores it (render.js fetches the CSV and passes rows), but keeping it makes the spec
        # valid against the engine schema and self-describing.
        data_name = spec.get("data", "data.csv")
        if not isinstance(data_name, str):
            fail(f"{config}: only a simple 'spec.data: <filename>' is supported in this tool")
        if not (folder / data_name).exists():
            fail(f"{config}: data file not found ({folder / data_name})")

        if figure_type == "chart":
            apply_events(spec, front, tab_id, fig_id, config)

        # Translate model conventions (unit column, projected flag, scenario ids) into spec keys.
        augment_spec(spec, front, folder, config, figure_type)

        figure = {
            "id": fig_id,
            "short_label": short_label,
            "figureType": figure_type,
            # data is resolved by app.js against data_base_url (./data/): store the path relative
            # to the data dir.
            "data": f"{tab_id}/{fig_id}/{data_name}",
            "spec": spec,
            "body_html": render_markdown(body),
        }
    if section_id:
        figure["section"] = section_id
    if "variants" in front:
        figure["variants"] = front["variants"]
    selectors = list(front.get("selectors") or [])
    if front.get("scenario_role") == "selector":
        selectors.append(scenario_selector())
    if selectors:
        figure["selectors"] = selectors
    if "total" in front:
        figure["total"] = front["total"]
    # `lead: true` renders the figure's markdown body ABOVE the figure (an intro) instead of
    # below it as a description — used to fold section-intro copy onto its lead figure.
    if front.get("lead"):
        figure["lead"] = True
    return figure


def ordered_figures(tab: dict) -> list[tuple[str, "str | None"]]:
    """(figure_id, section_id) pairs in nav/display order."""
    pairs: list[tuple[str, "str | None"]] = []
    sections = tab.get("sections")
    if sections:
        for s in sections:
            for fid in s.get("figures", []):
                pairs.append((fid, s["id"]))
    for fid in tab.get("figures", []):
        pairs.append((fid, None))
    return pairs


def build_tab(tab: dict) -> dict:
    out = {"id": tab["id"], "label": tab["label"]}
    if "description" in tab:
        out["description"] = tab["description"]

    # The Previous Vintages tab carries no figures of its own — its content is the `vintages`
    # array (archived, pre-compiled scenario tabs), attached to the manifest in main(). Emit only
    # the marker so app.js can recognize it; if no vintages exist, main() drops the tab entirely.
    if tab.get("kind") == "vintages":
        out["kind"] = "vintages"
        return out

    if "sections" in tab:
        # label may be empty/absent → the sidebar renders the section's figures with no heading.
        out["sections"] = [{"id": s["id"], "label": s.get("label", "")} for s in tab["sections"]]
    if "toggles" in tab:
        out["toggles"] = tab["toggles"]

    figures = []
    num = 0
    for fid, section_id in ordered_figures(tab):
        fig = build_figure(tab["id"], fid, section_id)
        # Charts and tables share one continuous sidebar number sequence (1..N); prose panes
        # are unnumbered.
        if fig["figureType"] in ("chart", "table", "composite"):
            num += 1
            fig["figureNum"] = num
        figures.append(fig)
    out["figures"] = figures
    return out


def load_model_meta() -> dict:
    """Populate SCENARIOS / DEFAULT_SCENARIO from model-meta.json (written by
    sync-model-data.py). Returns the provenance block (empty if not yet synced)."""
    if not MODEL_META.exists():
        return {}
    meta = json.loads(MODEL_META.read_text(encoding="utf-8"))
    SCENARIOS.clear()
    SCENARIOS.extend(meta.get("scenarios", []))
    global DEFAULT_SCENARIO
    DEFAULT_SCENARIO = meta.get("default_scenario")
    return meta.get("provenance") or {}


def _vintage_time_label(published_at: str) -> str:
    """`2026-07-16T11:02:00-0400` → `11:02 AM` (local wall time as published)."""
    from datetime import datetime
    try:
        dt = datetime.fromisoformat(published_at)
    except (ValueError, TypeError):
        return ""
    hour = dt.hour % 12 or 12
    return f"{hour}:{dt.minute:02d} {'AM' if dt.hour < 12 else 'PM'}"


def load_vintages() -> list:
    """Collect archived vintages from data/previous-vintages/*/vintage.json (written by
    sync-model-data.py's archive_current), newest first. Each is a pre-compiled snapshot of the
    default- and alternative-scenario tabs plus a carried-over changes note — passed through
    verbatim, never recompiled, so an old vintage renders exactly as it was published."""
    root = DATA_DIR / "previous-vintages"
    if not root.is_dir():
        return []
    out = []
    for d in sorted(p for p in root.iterdir() if p.is_dir()):
        vj = d / "vintage.json"
        if vj.exists():
            out.append(json.loads(vj.read_text(encoding="utf-8")))
    # Newest first, using the full publish timestamp so same-day vintages order correctly.
    out.sort(key=lambda v: v.get("published_at") or v.get("date") or "", reverse=True)
    # When two vintages share a calendar date, append the publish time so the dropdown labels stay
    # distinct (e.g. "July 16, 2026 (3:00 PM)").
    from collections import Counter
    per_date = Counter(v.get("date") for v in out)
    for v in out:
        if per_date[v.get("date")] > 1:
            t = _vintage_time_label(v.get("published_at"))
            if t:
                v["label"] = f"{v.get('label')} ({t})"
    return out


def format_published(published_at: str) -> str:
    """`2026-07-02T11:54:11-0400` → `July 2, 2026` (date part only, tz-agnostic)."""
    from datetime import date
    try:
        d = date.fromisoformat(published_at[:10])
    except ValueError:
        return published_at
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def main() -> None:
    if not TRACKER.exists():
        fail(f"tracker.yaml not found at {TRACKER}")
    tracker = yaml.safe_load(TRACKER.read_text(encoding="utf-8")) or {}

    SCENARIO_COLORS.clear()
    SCENARIO_COLORS.update(tracker.get("scenario_colors") or {})

    # The release block is entirely model-derived: `updated` from the synced vintage's published_at,
    # `vintage` from its interface_vintage. (No editorial date/version in tracker.yaml.)
    release = dict(tracker.get("release") or {})
    provenance = load_model_meta()
    if provenance.get("published_at"):
        release["updated"] = format_published(provenance["published_at"])
    if provenance.get("interface_vintage"):
        release["vintage"] = provenance["interface_vintage"]

    RELEASE.clear()
    RELEASE.update(release)  # available to {date: ...} substitution during tab build

    manifest = {
        "release": release,
        "data_base_url": "./data/",
        "tabs": [build_tab(tab) for tab in tracker.get("tabs", [])],
    }

    # Fold in archived vintages. With none present, drop the (empty) Previous Vintages tab so the
    # tool degrades cleanly to the live report.
    vintages = load_vintages()
    if vintages:
        manifest["vintages"] = vintages
    else:
        manifest["tabs"] = [t for t in manifest["tabs"] if t.get("kind") != "vintages"]

    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    n_tabs = len(manifest["tabs"])
    n_figs = sum(len(t.get("figures", [])) for t in manifest["tabs"])
    n_vin = len(manifest.get("vintages", []))
    print(f"build-manifest: wrote {OUT.relative_to(DATA_DIR.parent)} "
          f"({n_tabs} tabs, {n_figs} figures, {n_vin} vintages)")


if __name__ == "__main__":
    main()
