"""Assemble data/manifest.json from tracker.yaml + per-figure config.md
files. Replaces the retiring build-csvs.py for steady-state operation.

Inputs:
  data/tracker.yaml             tab metadata, figureDefaults, toggles, release
  data/<tab>/<slug>/config.md   YAML frontmatter (the chart-block schema)
                                + markdown body (description)
  data/<tab>/<slug>/*.csv       chart data
  data/current-update.md        markdown body for the landing tab

Output:
  data/manifest.json            the schema the renderer consumes

Validation layers — every failure raises with a useful pointer:
  1. Structural (JSON Schema, additionalProperties: false everywhere):
     types, required fields, enums (xAxisType, kind, ui, …), shape
     of policy objects.
  2. Cross-reference (procedural): id ↔ folder, tab ↔ parent folder,
     applies_to_figures resolves, section ids resolve, every
     series_order / series_colors / series_styles / confidence_bands
     series value appears in the chart's data.
  3. CSV format: required columns exist; every row's `time` parses
     under the declared xAxisType; `value` and CI columns parse as
     numeric or empty.
"""

from __future__ import annotations

import csv
import datetime as dt
import html
import json
import re
import sys
from pathlib import Path

import jsonschema
import markdown
import yaml


HERE = Path(__file__).resolve().parent
DATA_DIR = HERE.parent / "data"

# Download-only data: a folder of CSVs shipped in the "Download All Data" ZIP
# but never used to build a chart. It has no config.md (so figure discovery
# ignores it); index.yaml is the authoritative, descriptions-bearing listing.
EXTRA_DIR_NAME = "crosswalks"
EXTRA_INDEX_NAME = "index.yaml"


# ---------------------------------------------------------------------------
# JSON Schemas (Draft 2020-12). Strict: additionalProperties: false at
# every level so typos like `xAxisTpye` or `serires_order` fail loudly.

_X_AXIS_POLICY = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "anchorAtZero": {"type": "boolean"},
        "markers": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["x"],
                "properties": {
                    "x": {"type": "string"},
                    "label": {"type": "string"},
                    "style": {"type": "string", "enum": ["dashed", "solid"]},
                    "color": {"type": "string"},
                    "strokeWidth": {"type": "number"},
                },
            },
        },
    },
}

_Y_AXIS_POLICY = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "min": {"type": "number"},
        "max": {"type": "number"},
        "includeZero": {"type": "boolean"},
        "tickCount": {"type": "integer", "minimum": 1},
        "autoWiden": {
            "type": "object",
            "additionalProperties": False,
            "required": ["step"],
            "properties": {"step": {"type": "number"}},
        },
    },
}

_VARIANT = {
    "type": "object",
    "additionalProperties": False,
    "required": ["id"],
    "properties": {
        "id": {"type": "string"},
        "subtitle": {"type": "string"},
        "x_axis_title": {"type": "string"},
        # Allows a variant to override the chart-level xAxisType. Used when
        # different variants of the same chart have different time axes —
        # e.g. indexed (numeric months_gone) vs rolling (temporal YYYY-MM-DD).
        "xAxisType": {"type": "string", "enum": ["numeric", "temporal", "quarterly"]},
        "yAxisPolicy": _Y_AXIS_POLICY,
    },
}

_SELECTOR = {
    "type": "object",
    "additionalProperties": False,
    "required": ["id", "kind", "ui", "options"],
    "properties": {
        "id": {"type": "string"},
        "kind": {"type": "string", "enum": ["single", "all"]},
        "ui": {"type": "string", "enum": ["title-inline", "sidebar", "none"]},
        "default": {"type": "string"},
        "options": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["id", "label"],
                "properties": {
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    # Optional canonical color for the option, used to tint the
                    # title-inline selector so it matches the series colors in
                    # related figures.
                    "color": {"type": "string"},
                },
            },
        },
    },
}

_CHART_COMMON_PROPS = {
    "chartType": {"type": "string", "enum": ["line"]},
    "xAxisType": {"type": "string", "enum": ["numeric", "temporal", "quarterly"]},
    "x_axis_title": {"type": "string"},
    "xAxisPolicy": _X_AXIS_POLICY,
    "yAxisPolicy": _Y_AXIS_POLICY,
    "title": {"type": "string"},
    "subtitle": {"type": "string"},
    "source": {"type": "string"},
    "note": {"type": "string"},
    "series_field": {"type": "string"},
    "series_order": {"type": "array", "items": {"type": "string"}},
    "series_colors": {
        "type": "object",
        "additionalProperties": {"type": "string"},
    },
    "series_styles": {
        "type": "object",
        "additionalProperties": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"dashed": {"type": "boolean"}},
        },
    },
    # Optional display-name mapping: short data keys in the CSV's
    # `series` column → human-readable labels for legend and tooltip.
    # All other config refs (series_order / colors / styles /
    # confidence_bands.series) continue to use the short data key.
    "series_labels": {
        "type": "object",
        "additionalProperties": {"type": "string"},
    },
    "confidence_bands": {
        "type": "array",
        "items": {
            "type": "object",
            "additionalProperties": False,
            "required": ["series", "lower", "upper"],
            "properties": {
                "series": {"type": "string"},
                "lower": {"type": "string"},
                "upper": {"type": "string"},
            },
        },
    },
    "data": {"type": "string"},
    "variants": {"type": "array", "items": _VARIANT},
    "selectors": {"type": "array", "items": _SELECTOR},
}

CHART_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    # `data` is required at the chart level — every chart has exactly one
    # CSV. Variant and selector dimensions are encoded as columns inside
    # it (no more per-variant data fields or file_patterns).
    "required": ["chartType", "title", "data"],
    "properties": {
        "chartLetter": {"type": "string", "pattern": "^[a-z]$"},
        **_CHART_COMMON_PROPS,
    },
}

FIGURE_DEFAULTS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": _CHART_COMMON_PROPS,
}

FIGURE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    # id / tab / figureNum / section are derived: id comes from the
    # folder name, tab from the parent folder, figureNum/section from
    # the figure's position in tracker.yaml's nav lists. The figure's
    # config.md frontmatter holds only its content.
    "required": ["short_label", "charts"],
    "properties": {
        "short_label": {"type": "string"},
        "charts": {
            "type": "array",
            "minItems": 1,
            "items": CHART_SCHEMA,
        },
    },
}

TRACKER_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["release", "tabs"],
    "properties": {
        "release": {
            "type": "object",
            "additionalProperties": False,
            "required": ["updated", "version"],
            "properties": {
                "updated": {"type": "string"},
                "version": {"type": "string"},
            },
        },
        "tabs": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["id", "label"],
                "properties": {
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    "description": {"type": "string"},
                    "figureDefaults": FIGURE_DEFAULTS_SCHEMA,
                    "sections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["id", "label", "figures"],
                            "properties": {
                                "id": {"type": "string"},
                                "label": {"type": "string"},
                                "figures": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                        },
                    },
                    "figures": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "toggles": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["id", "label", "default", "options",
                                         "applies_to_figures"],
                            "properties": {
                                "id": {"type": "string"},
                                "label": {"type": "string"},
                                "default": {"type": "string"},
                                "options": {
                                    "type": "array",
                                    "minItems": 1,
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["id", "label"],
                                        "properties": {
                                            "id": {"type": "string"},
                                            "label": {"type": "string"},
                                        },
                                    },
                                },
                                "applies_to_figures": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                        },
                    },
                },
            },
        },
    },
}


def schema_check(instance: dict, schema: dict, ctx: str) -> None:
    """Validate against a schema; reraise as a tight message."""
    try:
        jsonschema.validate(instance, schema)
    except jsonschema.ValidationError as e:
        path = "/".join(str(p) for p in e.absolute_path) or "<root>"
        raise ValueError(f"{ctx}: schema error at {path}: {e.message}") from None


# ---------------------------------------------------------------------------
# Frontmatter parsing.

def load_yaml(path: Path, *, where: str = ""):
    """Load a YAML file, turning PyYAML's exceptions into a BUILD FAILED
    message that names the file and the line/column of the problem (rather
    than a raw scanner/parser traceback). `where` optionally labels a region
    within the file (e.g. 'frontmatter')."""
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        raise ValueError(_yaml_error_msg(path, e, where)) from None


def _yaml_error_msg(path: Path, e: yaml.YAMLError, where: str = "") -> str:
    mark = getattr(e, "problem_mark", None)
    loc = f" (line {mark.line + 1}, column {mark.column + 1})" if mark else ""
    detail = getattr(e, "problem", None) or str(e).split("\n")[0]
    region = f" {where}" if where else ""
    return f"{path}:{region} YAML syntax error{loc}: {detail}"


def parse_config_md(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.DOTALL)
    if not m:
        raise ValueError(f"{path}: missing YAML frontmatter delimiters")
    try:
        front = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        raise ValueError(_yaml_error_msg(path, e, where="frontmatter")) from None
    body = m.group(2).strip()
    return front, body


def render_markdown(body: str) -> str:
    return markdown.markdown(body, extensions=["extra"]) if body else ""


# ---------------------------------------------------------------------------
# {date: ...} token substitution for current-update.md.
#
# Makes date insertion explicit in the markdown instead of being silently
# injected by the renderer. `{date: updated}` resolves to release.updated;
# any literal (with spaces/digits/capitals) renders as-is. A standalone token
# (its own paragraph) becomes a styled date block; an inline token becomes
# plain text. Substitution runs on the *rendered* HTML — verified that
# python-markdown (extra/attr_list) leaves `{date: ...}` tokens untouched.

_DATE_TOKEN_BLOCK = re.compile(r"<p>\s*\{date:\s*([^}]+?)\s*\}\s*</p>")
_DATE_TOKEN_INLINE = re.compile(r"\{date:\s*([^}]+?)\s*\}")


def _resolve_date_token(value: str, release: dict) -> str:
    if value == "updated":
        return release["updated"]
    # Bare lowercase identifier that isn't a known keyword => almost certainly a typo.
    if re.fullmatch(r"[a-z][a-z0-9_]*", value):
        raise ValueError(
            f"current-update.md: unknown date keyword {value!r}. "
            f"Recognized keyword: 'updated'. For a literal date, spell it out, "
            f"e.g. {{date: January 1, 1900}}.")
    return value  # literal date string


def substitute_date_tokens(rendered_html: str, release: dict) -> str:
    # Standalone token -> styled date block (escape the resolved literal).
    out = _DATE_TOKEN_BLOCK.sub(
        lambda m: '<p class="current-update-date">'
                  + html.escape(_resolve_date_token(m.group(1), release))
                  + '</p>',
        rendered_html)
    # Any remaining inline token -> plain resolved text.
    out = _DATE_TOKEN_INLINE.sub(
        lambda m: html.escape(_resolve_date_token(m.group(1), release)),
        out)
    return out


# ---------------------------------------------------------------------------
# CSV-level validation.

_QUARTER_RE = re.compile(r"^\d{4}Q[1-4]$")
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _parse_time_for(x_axis_type: str, value: str) -> None:
    """Raise if `value` doesn't parse under the declared xAxisType."""
    if x_axis_type == "numeric":
        # Accept "0", "12", "1.5", etc. Anything float() rejects → error.
        float(value)
    elif x_axis_type == "temporal":
        if not _DATE_RE.match(value):
            raise ValueError(f"expected YYYY-MM-DD, got {value!r}")
        dt.date.fromisoformat(value)
    elif x_axis_type == "quarterly":
        if not _QUARTER_RE.match(value):
            raise ValueError(f"expected YYYYQ#, got {value!r}")
    else:
        raise ValueError(f"unknown xAxisType {x_axis_type!r}")


def _scan_csv(path: Path, x_axis_type: str, ci_cols: list[str],
              dim_cols: list[str],
              series_field: str = "series",
              variant_x_axis_types: dict[str, str] | None = None,
              ) -> tuple[set[str], dict[str, set[str]]]:
    """Validate every row in a CSV. Returns (series_seen, dim_values_seen)
    where dim_values_seen maps each requested dimension column to the set
    of distinct values it carried.

    `variant_x_axis_types` is an optional {variant_id: xAxisType} mapping.
    When provided, rows belonging to a variant whose xAxisType differs from
    the chart-level default are validated against that variant's type instead.
    """
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        cols = reader.fieldnames or []
        # time/value are part of the CSV contract regardless of config.
        for required in ("time", "value"):
            if required not in cols:
                raise ValueError(
                    f"{path}: CSV is missing the required {required!r} column.")
        # The series column name is config-driven (series_field). A mismatch
        # here usually means config and the CSV disagree, not a broken CSV.
        if series_field not in cols:
            if series_field == "series":
                raise ValueError(
                    f"{path}: CSV is missing the required 'series' column.")
            raise ValueError(
                f"{path}: config/data mismatch: config sets "
                f"series_field: {series_field!r}, but the CSV has no such column "
                f"(CSV columns: {sorted(cols)!r}). Fix series_field in config, "
                f"or rename/add the column in the CSV.")
        # CI and dimension columns are required only because the config asks
        # for them. Lead the editor toward the config, which is the usual fix.
        for ci_col in ci_cols:
            if ci_col not in cols:
                raise ValueError(
                    f"{path}: config/data mismatch: confidence_bands in config "
                    f"reference a {ci_col!r} column the CSV does not have. Remove "
                    f"it from confidence_bands if no longer needed, or add the "
                    f"column to the CSV.")
        for dim_col in dim_cols:
            if dim_col not in cols:
                raise ValueError(
                    f"{path}: config/data mismatch: a variant/selector in config "
                    f"needs a {dim_col!r} column the CSV does not have. Remove the "
                    f"variant/selector from config if no longer needed, or add the "
                    f"column to the CSV.")
        series_seen: set[str] = set()
        dim_values_seen: dict[str, set[str]] = {c: set() for c in dim_cols}
        for i, row in enumerate(reader, start=2):  # row 1 = header
            # Resolve the effective xAxisType for this row. If the CSV has a
            # `variant` column and that variant declares its own xAxisType,
            # use it; otherwise fall back to the chart-level default.
            row_x_type = x_axis_type
            if variant_x_axis_types and "variant" in row:
                row_x_type = variant_x_axis_types.get(row["variant"], x_axis_type)
            try:
                _parse_time_for(row_x_type, row["time"])
            except ValueError as e:
                raise ValueError(f"{path} row {i}: time: {e}") from None
            if row["value"] != "":
                try:
                    float(row["value"])
                except ValueError:
                    raise ValueError(
                        f"{path} row {i}: value {row['value']!r} not numeric") from None
            for ci_col in ci_cols:
                v = row.get(ci_col, "")
                if v != "":
                    try:
                        float(v)
                    except ValueError:
                        raise ValueError(
                            f"{path} row {i}: {ci_col} {v!r} not numeric") from None
            series_seen.add(row[series_field])
            for dim_col in dim_cols:
                dim_values_seen[dim_col].add(row.get(dim_col, ""))
    return series_seen, dim_values_seen


# ---------------------------------------------------------------------------
# Per-figure cross-reference checks.

def _resolve_x_axis_type(chart: dict, tab_defaults: dict) -> str:
    return chart.get("xAxisType") or tab_defaults.get("xAxisType") or ""


def _ci_columns_for(chart: dict) -> list[str]:
    """Distinct CI column names referenced by the chart's confidence_bands."""
    cols: list[str] = []
    for b in chart.get("confidence_bands", []) or []:
        for k in ("lower", "upper"):
            if b[k] not in cols:
                cols.append(b[k])
    return cols


def _csv_path_for_chart(folder: Path, chart: dict) -> Path:
    """Resolve the chart's single CSV path."""
    if "data" not in chart:
        raise ValueError(f"{folder}: chart has no data field")
    p = folder / chart["data"]
    if not p.exists():
        raise FileNotFoundError(f"{folder}: data file {p.name} not found")
    return p


def validate_figure_data(figure: dict, folder: Path,
                         tab_defaults: dict) -> None:
    """CSV + cross-reference checks for a single figure."""
    for i, chart in enumerate(figure["charts"]):
        ctx = f"{folder}/config.md chart[{i}]"
        x_axis_type = _resolve_x_axis_type(chart, tab_defaults)
        if not x_axis_type:
            raise ValueError(f"{ctx}: no xAxisType (chart or tab default)")
        ci_cols = _ci_columns_for(chart)
        csv_path = _csv_path_for_chart(folder, chart)

        # Required dimension columns based on the chart's structure.
        required_dim_cols: list[tuple[str, list[str]]] = []  # (col, allowed values)
        if chart.get("variants"):
            required_dim_cols.append(
                ("variant", [v["id"] for v in chart["variants"]]))
        for sel in chart.get("selectors", []) or []:
            if sel.get("kind") == "single":
                required_dim_cols.append(
                    (sel["id"], [o["id"] for o in sel["options"]]))

        # Build a per-variant xAxisType override map from any variants that
        # declare their own xAxisType (e.g. rolling → temporal).
        variant_x_axis_types: dict[str, str] = {
            v["id"]: v["xAxisType"]
            for v in (chart.get("variants") or [])
            if "xAxisType" in v
        }

        series_field = chart.get("series_field") or "series"
        series_union, dim_values_seen = _scan_csv(
            csv_path, x_axis_type, ci_cols, [c for c, _ in required_dim_cols],
            series_field=series_field,
            variant_x_axis_types=variant_x_axis_types or None,
        )

        # Every dimension value declared in config must appear in data. When it
        # doesn't, the config is usually asking for a variant/option that was
        # dropped from the data — so point the fix at config first.
        for col, allowed in required_dim_cols:
            seen = dim_values_seen.get(col, set())
            unknown = [v for v in allowed if v not in seen]
            if unknown:
                raise ValueError(
                    f"{ctx}: config/data mismatch: config declares {col} "
                    f"value(s) {unknown!r} that never appear in the CSV "
                    f"(CSV {col} values: {sorted(seen)!r}). Remove the unused "
                    f"value(s) from config, or add matching rows to the CSV.")

        # Cross-reference: every series-named-by-config must exist in data.
        def _missing(named: list[str] | dict, source: str) -> None:
            keys = list(named) if isinstance(named, list) else list(named.keys())
            unknown = [k for k in keys if k not in series_union]
            if unknown:
                raise ValueError(
                    f"{ctx}: config/data mismatch: {source} in config names "
                    f"series {unknown!r} not found in the data (CSV series: "
                    f"{sorted(series_union)!r}). Remove them from {source} if no "
                    f"longer needed, or add the series to the CSV.")
        _missing(chart.get("series_order") or [], "series_order")
        _missing(chart.get("series_colors") or {}, "series_colors")
        _missing(chart.get("series_styles") or {}, "series_styles")
        _missing(chart.get("series_labels") or {}, "series_labels")
        for b in chart.get("confidence_bands") or []:
            if b["series"] not in series_union:
                raise ValueError(
                    f"{ctx}: config/data mismatch: confidence_bands names series "
                    f"{b['series']!r} not found in the data (CSV series: "
                    f"{sorted(series_union)!r}). Remove it from config, or add the "
                    f"series to the CSV.")


# ---------------------------------------------------------------------------
# Path rewriting (manifest emits data paths relative to data/).

def prefix_data_paths(figure: dict, folder_rel: str) -> None:
    """Rewrite chart.data from a folder-local filename to a path relative
    to data/ so the renderer can fetch it directly."""
    for chart in figure.get("charts", []):
        if "data" in chart and "/" not in chart["data"]:
            chart["data"] = f"{folder_rel}/{chart['data']}"


# ---------------------------------------------------------------------------
# Figure assembly.

def assemble_figure(folder: Path, nav_info: dict, tab_defaults_by_tab: dict) -> dict:
    """Parse the figure's config.md and merge in the navigation info
    (id / tab / figureNum / section) resolved from tracker.yaml's nav
    lists. The figure's frontmatter holds only its own content
    (label, short_label, charts)."""
    front, body = parse_config_md(folder / "config.md")
    schema_check(front, FIGURE_SCHEMA, f"{folder}/config.md")

    tab_defaults = tab_defaults_by_tab.get(nav_info["tab"], {})
    validate_figure_data(front, folder, tab_defaults)

    out = dict(front)
    out.update(nav_info)         # injects id, tab, figureNum, [section]
    out["description_html"] = render_markdown(body)
    folder_rel = folder.relative_to(DATA_DIR).as_posix()
    prefix_data_paths(out, folder_rel)
    return out


def build_nav_map(tracker: dict) -> dict[str, dict]:
    """Walk tracker.yaml's nav structure to produce { figureId: nav_info }
    where nav_info has tab, figureNum (per-tab, 1-indexed), and
    optional section. The figureId is the folder name (slug)."""
    nav: dict[str, dict] = {}
    for tab in tracker["tabs"]:
        tab_id = tab["id"]
        n = 0
        # If the tab has sections, walk them in order; otherwise read
        # the tab's own `figures` list.
        if tab.get("sections"):
            for section in tab["sections"]:
                for fig_id in section.get("figures", []) or []:
                    if fig_id in nav:
                        raise ValueError(
                            f"tracker.yaml: figure {fig_id!r} listed twice")
                    n += 1
                    nav[fig_id] = {
                        "id": fig_id, "tab": tab_id,
                        "figureNum": n, "section": section["id"],
                    }
        for fig_id in tab.get("figures", []) or []:
            if fig_id in nav:
                raise ValueError(
                    f"tracker.yaml: figure {fig_id!r} listed twice")
            n += 1
            nav[fig_id] = {"id": fig_id, "tab": tab_id, "figureNum": n}
    return nav


# ---------------------------------------------------------------------------
# Download-only data (crosswalks): enumerated into the manifest so the
# "Download All Data" ZIP can bundle them, but not part of any chart.

def load_additional_downloads(data_dir: Path) -> dict | None:
    """Read data/crosswalks/index.yaml and return a manifest block describing
    the download-only CSVs, or None if the folder doesn't exist. The index is
    authoritative: every CSV on disk must be listed and every listed file must
    exist, so nothing ships undescribed or goes missing silently."""
    folder = data_dir / EXTRA_DIR_NAME
    if not folder.is_dir():
        return None

    # A config.md here would be mistaken for a figure by discovery — forbid it.
    stray_configs = sorted(p.relative_to(data_dir).as_posix()
                           for p in folder.rglob("config.md"))
    if stray_configs:
        raise ValueError(
            f"{EXTRA_DIR_NAME}/ is download-only and must not contain a "
            f"config.md (would be mistaken for a figure): {stray_configs}")

    index_path = folder / EXTRA_INDEX_NAME
    if not index_path.exists():
        raise ValueError(
            f"{EXTRA_DIR_NAME}/ exists but has no {EXTRA_INDEX_NAME}. Add one "
            f"listing each CSV with a description.")
    index = load_yaml(index_path) or {}

    label = index.get("label", "Additional data")
    entries = index.get("files", []) or []

    listed: list[dict] = []
    listed_names: set[str] = set()
    for entry in entries:
        name = entry.get("path")
        if not name:
            raise ValueError(
                f"{EXTRA_DIR_NAME}/{EXTRA_INDEX_NAME}: every files[] entry "
                f"needs a 'path'.")
        if not (folder / name).exists():
            raise ValueError(
                f"{EXTRA_DIR_NAME}/{EXTRA_INDEX_NAME} lists {name!r} but "
                f"{EXTRA_DIR_NAME}/{name} does not exist.")
        listed_names.add(name)
        listed.append({
            "path": f"{EXTRA_DIR_NAME}/{name}",
            "description": entry.get("description", ""),
        })

    # Every CSV on disk must be in the index.
    on_disk = {p.relative_to(folder).as_posix() for p in folder.rglob("*.csv")}
    unlisted = sorted(on_disk - listed_names)
    if unlisted:
        raise ValueError(
            f"{EXTRA_DIR_NAME}/ has CSV(s) not listed in {EXTRA_INDEX_NAME}: "
            f"{unlisted}. Add them (with a description) or remove them.")

    return {"label": label, "files": listed}


# ---------------------------------------------------------------------------
# Main.

def main():
    tracker = load_yaml(DATA_DIR / "tracker.yaml")
    schema_check(tracker, TRACKER_SCHEMA, "tracker.yaml")

    tab_defaults_by_tab = {
        t["id"]: t.get("figureDefaults", {}) for t in tracker["tabs"]
    }
    nav_map = build_nav_map(tracker)

    # Cross-reference: every figure folder must appear in tracker.yaml's
    # nav lists, and every nav entry must have a folder. Both directions
    # fail loudly so a missing entry can't silently drop a figure from
    # the sidebar.
    figure_folders = {cfg.parent.name: cfg
                      for cfg in sorted(DATA_DIR.glob("*/*/config.md"))}
    missing_from_nav = sorted(set(figure_folders) - set(nav_map))
    missing_from_disk = sorted(set(nav_map) - set(figure_folders))
    if missing_from_nav:
        raise ValueError(
            f"tracker.yaml: figure folder(s) not listed in any tab's "
            f"sections/figures: {missing_from_nav}")
    if missing_from_disk:
        raise ValueError(
            f"tracker.yaml: nav lists reference figure(s) with no folder: "
            f"{missing_from_disk}")

    figures_by_id: dict[str, dict] = {}
    for fig_id, cfg in figure_folders.items():
        nav_info = nav_map[fig_id]
        # Folder parent (tab) must match the tab the nav entry assigned.
        if cfg.parent.parent.name != nav_info["tab"]:
            raise ValueError(
                f"{cfg}: lives under tab folder "
                f"{cfg.parent.parent.name!r} but tracker.yaml lists it "
                f"under tab {nav_info['tab']!r}")
        fig = assemble_figure(cfg.parent, nav_info, tab_defaults_by_tab)
        figures_by_id[fig_id] = fig

    cu_md = DATA_DIR / "current-update.md"
    cu_html = render_markdown(cu_md.read_text(encoding="utf-8")) if cu_md.exists() else ""
    cu_html = substitute_date_tokens(cu_html, tracker["release"])

    out_tabs = []
    for tab_cfg in tracker["tabs"]:
        tab = dict(tab_cfg)
        if tab["id"] == "current-update":
            tab["body_html"] = cu_html
            out_tabs.append(tab)
            continue
        figs = [f for f in figures_by_id.values() if f.get("tab") == tab["id"]]
        figs.sort(key=lambda f: f["figureNum"])
        tab["figures"] = figs
        # applies_to_figures references must resolve.
        for t in tab.get("toggles", []) or []:
            for fid in t.get("applies_to_figures", []) or []:
                if fid not in figures_by_id:
                    raise ValueError(
                        f"tab {tab['id']} toggle {t['id']}: "
                        f"applies_to_figures references unknown id {fid!r}")
        out_tabs.append(tab)

    manifest = {
        "data_base_url": "./data/",
        "release": tracker["release"],
        "tabs": out_tabs,
    }
    extra = load_additional_downloads(DATA_DIR)
    if extra:
        manifest["additional_downloads"] = extra
    (DATA_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8")
    print(f"OK — manifest.json built ({len(figures_by_id)} figures across "
          f"{len(out_tabs)} tabs).")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, FileNotFoundError) as e:
        # The intended, well-described errors. Message already names the file.
        print(f"BUILD FAILED: {e} (no manifest written)", file=sys.stderr)
        sys.exit(1)
    except Exception as e:  # noqa: BLE001 — last-resort guard
        # Anything unforeseen: still report a single clear line instead of a
        # raw traceback, and name the exception type so it can be diagnosed.
        print(f"BUILD FAILED (unexpected {type(e).__name__}): {e} "
              f"(no manifest written)", file=sys.stderr)
        sys.exit(1)
