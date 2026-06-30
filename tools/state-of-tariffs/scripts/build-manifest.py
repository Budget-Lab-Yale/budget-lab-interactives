#!/usr/bin/env python3
"""Assemble data/manifest.json from tracker.yaml + per-figure config.md.

State of Tariffs mirrors the AI Labor Market Tracker's manifest pipeline, but each
figure's `spec` is an engine-native ChartSpec / TableSpec (rendered at runtime by the
vendored chart engine via render.js), not a tracker-specific chart block.

Inputs (under tools/state-of-tariffs/data/):
  tracker.yaml                      release + tab / section / figure / toggle definitions
  current-update.md                 markdown body for the overview tab (optional)
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
import json
import re
import sys
from pathlib import Path

import markdown
import yaml

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TRACKER = DATA_DIR / "tracker.yaml"
CURRENT_UPDATE = DATA_DIR / "current-update.md"
OUT = DATA_DIR / "manifest.json"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)


def fail(msg: str) -> "None":
    print(f"build-manifest: ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def render_markdown(body: str) -> str:
    return markdown.markdown(body.strip(), extensions=["extra"]) if body.strip() else ""


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

    spec = front.get("spec")
    if not isinstance(spec, dict):
        fail(f"{config}: 'spec' (mapping) is required")
    if figure_type == "chart" and "chartType" not in spec:
        fail(f"{config}: chart spec must set 'chartType'")
    if figure_type == "table" and not all(k in spec for k in ("stub", "header", "value")):
        fail(f"{config}: table spec must set 'stub', 'header', and 'value'")

    # Data lives in the engine spec (`spec.data`), the engine-native authoring form.
    # The runtime mount ignores it (render.js fetches the CSV and passes rows), but
    # keeping it makes the spec valid against the engine schema and self-describing.
    # `spec.data` may be a bare filename or an object {file: "..."}; accept the simple form.
    data_name = spec.get("data", "data.csv")
    if not isinstance(data_name, str):
        fail(f"{config}: only a simple 'spec.data: <filename>' is supported in this tool")
    data_path = folder / data_name
    if not data_path.exists():
        fail(f"{config}: data file not found ({data_path})")

    if figure_type == "chart":
        apply_events(spec, front, tab_id, fig_id, config)

    figure = {
        "id": fig_id,
        "short_label": short_label,
        "figureType": figure_type,
        # data is resolved by app.js against data_base_url (./data/): store the
        # path relative to the data dir.
        "data": f"{tab_id}/{fig_id}/{data_name}",
        "spec": spec,
        "body_html": render_markdown(body),
    }
    if section_id:
        figure["section"] = section_id
    if "variants" in front:
        figure["variants"] = front["variants"]
    if "selectors" in front:
        figure["selectors"] = front["selectors"]
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

    if tab["id"] == "current-update":
        body = CURRENT_UPDATE.read_text(encoding="utf-8") if CURRENT_UPDATE.exists() else ""
        out["body_html"] = render_markdown(body)
        return out

    if "sections" in tab:
        out["sections"] = [{"id": s["id"], "label": s["label"]} for s in tab["sections"]]
    if "toggles" in tab:
        out["toggles"] = tab["toggles"]

    figures = []
    num = 0
    for fid, section_id in ordered_figures(tab):
        fig = build_figure(tab["id"], fid, section_id)
        # Prose panes are not numbered; charts/tables get sequential "Figure N".
        if fig["figureType"] in ("chart", "table"):
            num += 1
            fig["figureNum"] = num
        figures.append(fig)
    out["figures"] = figures
    return out


def main() -> None:
    if not TRACKER.exists():
        fail(f"tracker.yaml not found at {TRACKER}")
    tracker = yaml.safe_load(TRACKER.read_text(encoding="utf-8")) or {}

    manifest = {
        "release": tracker.get("release", {}),
        "data_base_url": "./data/",
        "tabs": [build_tab(tab) for tab in tracker.get("tabs", [])],
    }

    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    n_tabs = len(manifest["tabs"])
    n_figs = sum(len(t.get("figures", [])) for t in manifest["tabs"])
    print(f"build-manifest: wrote {OUT.relative_to(DATA_DIR.parent)} ({n_tabs} tabs, {n_figs} figures)")


if __name__ == "__main__":
    main()
