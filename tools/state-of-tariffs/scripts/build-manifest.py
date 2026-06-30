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

Run:  C:/Python314/python.exe scripts/build-manifest.py
"""

from __future__ import annotations

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


def build_figure(tab_id: str, fig_id: str, section_id: "str | None", num: int) -> dict:
    folder = DATA_DIR / tab_id / fig_id
    config = folder / "config.md"
    if not config.exists():
        fail(f"missing config.md for figure '{fig_id}' (expected {config})")

    front, body = parse_config_md(config)

    short_label = front.get("short_label")
    if not short_label:
        fail(f"{config}: 'short_label' is required")

    figure_type = front.get("figureType", "chart")
    if figure_type not in ("chart", "table"):
        fail(f"{config}: figureType must be 'chart' or 'table', got '{figure_type}'")

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

    figure = {
        "id": fig_id,
        "short_label": short_label,
        "figureNum": num,
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
    for num, (fid, section_id) in enumerate(ordered_figures(tab), start=1):
        figures.append(build_figure(tab["id"], fid, section_id, num))
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
