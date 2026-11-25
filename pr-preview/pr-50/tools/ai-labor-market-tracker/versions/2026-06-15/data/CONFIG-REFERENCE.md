# Tracker config reference

Authoritative list of fields editors can set in tracker configs. Defaults
are applied implicitly — only declare what differs.

The build script (`scripts/build-manifest.py`) validates every config
against the schemas defined inline in that file. Anything not listed
here will fail the build (`additionalProperties: false` everywhere).

---

## Files

```
data/
  tracker.yaml                          # tab-level wiring (release, defaults, toggles, sections)
  current-update.md                     # markdown body for the Current Update tab
  <tab>/<slug>/                         # one folder per figure
    config.md                           # YAML frontmatter + markdown body
    data.csv                            # one CSV per chart on the figure
```

After any edit, run `python scripts/build-manifest.py` to regenerate
`data/manifest.json`. The pre-commit hook and CI gate both re-run it.

---

## `tracker.yaml`

### Top level

| field | type | required | notes |
|---|---|---|---|
| `release` | object | yes | Update on each data refresh. |
| `release.updated` | string | yes | Human-readable date (e.g. `"June 5, 2026"`). |
| `release.version` | string | yes | E.g. `"1.0"`. |
| `tabs` | array | yes | One entry per tab, in display order. |

### Each tab

| field | type | required | notes |
|---|---|---|---|
| `id` | string | yes | URL slug; matches the figure-folder parent dir. |
| `label` | string | yes | Display name in the tab bar. |
| `description` | string | optional | Renders in the sidebar above the figure list. |
| `figureDefaults` | object | optional | Chart-block fields inherited by every figure in the tab (see chart fields below). Tab default beats no setting; chart-level beats tab default; variant override beats both. |
| `sections` | array | optional | Groups figures in the sidebar. Order is display order. Mutually exclusive with the tab-level `figures` field. |
| `sections[].id` | string | yes | Slug; only used internally as a stable section identifier. |
| `sections[].label` | string | yes | Section heading. |
| `sections[].figures` | array | yes | Figure ids (slugs), in display order. Each id must match a folder under `data/<tab>/`. The list position determines the figure's `figureNum` (1-indexed within the tab, summed across sections). |
| `figures` | array | optional | Used on tabs **without** sections (e.g. SDID). Figure ids in display order. |
| `toggles` | array | optional | Sidebar toggles that switch between variants. |
| `toggles[].id` | string | yes | Toggle name; the URL state stores `<id>=<option>`. |
| `toggles[].label` | string | yes | Display label above the toggle group. |
| `toggles[].default` | string | yes | Option id used when no URL state is present. |
| `toggles[].options` | array | yes | Each `{id, label}`. The id must match a `variant.id` inside the configs the toggle applies to. |
| `toggles[].applies_to_figures` | array | yes | List of figure ids (slugs) the toggle shows up for. |

---

## `<tab>/<slug>/config.md`

YAML frontmatter between `---` lines, then optional markdown body
(figure description, rendered to HTML and shown below the chart and
source line).

### Figure-level frontmatter

Navigation metadata (`id`, `tab`, `figureNum`, `section`) is **not** authored
here — it's derived: `id` from the folder name, `tab` from the parent
folder, `figureNum` from the figure's position in `tracker.yaml`'s nav
lists, `section` from which section's `figures` list contains it.

| field | type | required | notes |
|---|---|---|---|
| `short_label` | string | yes | Sidebar list item. |
| `charts` | array | yes | At least one chart block. Multiple charts stack vertically in the same card. |

### Each chart block (`charts[]`)

#### Identity

| field | type | required | notes |
|---|---|---|---|
| `chartLetter` | string | optional | Single letter (`a`, `b`, …). Required on multi-chart figures so the supertitle reads "Figure 1a / 1b"; omitted on single-chart figures. |
| `chartType` | enum | yes | Currently only `line`. |

#### Text

| field | type | required | notes |
|---|---|---|---|
| `title` | string | yes | Card title (above the chart). Rendered verbatim — no prefix-stripping or transformation. |
| `subtitle` | string | optional | Card subtitle (below the title). Supports `{toggleId}` / `{selectorId}` tokens, replaced with the active option's label (e.g. `Dissimilarity index (percentage points). {variant} baseline.` → `… (percentage points). Rolling 12-month baseline.`). Resolved for both the live chart and the PNG export. |
| `source` | string | optional | Source line below the chart. |
| `note` | string | optional | Note line below the chart, above the source. Supports the same `{toggleId}` / `{selectorId}` label tokens as `subtitle`. |

#### Axes

| field | type | required | notes |
|---|---|---|---|
| `xAxisType` | enum | yes (can inherit) | One of `numeric`, `temporal`, `quarterly`. Determines how `time` values in the CSV are parsed. Can be inherited from `tab.figureDefaults`. |
| `x_axis_title` | string | optional | Text below the x-axis (e.g., `"Months from baseline"`). |
| `xAxisPolicy.anchorAtZero` | boolean | optional | Numeric x-axis only. When `true`, extends the visible x-domain to include 0 even if the data starts later. |
| `xAxisPolicy.markers` | array | optional | Vertical reference lines (e.g., the SDID treatment marker). Each `{x, label?, style?, color?, strokeWidth?}`. `style` is `dashed` or `solid`. |
| `yAxisPolicy.min` | number | optional | Hard floor for the y-axis. |
| `yAxisPolicy.max` | number | optional | Hard ceiling for the y-axis. |
| `yAxisPolicy.includeZero` | boolean | optional | When `true` and no hard min/max, always extend the y-domain to include 0. |
| `yAxisPolicy.tickCount` | integer | optional | Approximate target number of y-axis ticks. Default 5. |
| `yAxisPolicy.autoWiden.step` | number | optional | When set and data exceeds `max`, round up to the next multiple of `step`. |

#### Series

| field | type | required | notes |
|---|---|---|---|
| `series_field` | string | optional | CSV column that identifies series. Default `"series"`. |
| `series_order` | array | optional | Array of series keys, in render order. When set, also acts as an **inclusion filter** — only listed series render. |
| `series_colors` | object | optional | `{ <seriesKey>: color }`. Overrides palette assignment for specific series. `color` is a named palette color (`blue`, `amber`, `violet`, `green`, `red`, `rose`, `russet`, their `-light` variants, plus `black`, `grey`, `navy`) or a raw `"#hex"`. |
| `series_styles` | object | optional | `{ <seriesKey>: { dashed: true } }`. Currently the only style flag is `dashed`. |
| `series_labels` | object | optional | `{ <seriesKey>: "Display name" }`. Optional display mapping; lets the CSV use short keys while the legend/tooltip show full names. All other refs (`series_order`, `series_colors`, `series_styles`, `confidence_bands.series`) continue to use the short key. |

#### Confidence band

| field | type | required | notes |
|---|---|---|---|
| `confidence_bands` | array | optional | Each `{series, lower, upper}`. `series` is the data key the band wraps; `lower` / `upper` are CSV column names. Renders as a tinted area behind the line. |

#### Data

| field | type | required | notes |
|---|---|---|---|
| `data` | string | yes | CSV path relative to the figure folder. Almost always `"data.csv"`. |
| `variants` | array | optional | Toggleable views of the same chart (e.g., indexed vs. rolling). Each variant filters the CSV to rows where `variant` column equals the variant's id; the active variant comes from the tab's `variant` toggle. The list order is the implicit default order — the first variant is used when no toggle value is in scope. |
| `variants[].id` | string | yes | Matches the toggle option id and the value in the CSV's `variant` column. The display label for the toggle button comes from `tracker.yaml`'s toggle option, not from here. |
| `variants[].subtitle` | string | optional | Variant-specific subtitle override. |
| `variants[].x_axis_title` | string | optional | Variant-specific axis title override. |
| `variants[].yAxisPolicy` | object | optional | Variant-specific axis-policy override (merged onto chart-level). |
| `selectors` | array | optional | Picker dimensions (e.g., industry). Filters the CSV by a column matching the selector's `id`. |
| `selectors[].id` | string | yes | Selector name; also the CSV column to filter by. |
| `selectors[].kind` | enum | yes | `single` (UI picks one) or `all` (no filter; every option renders). |
| `selectors[].ui` | enum | yes | `title-inline` (dropdown inside the chart title), `sidebar`, or `none`. |
| `selectors[].default` | string | optional | Default option id (required when `kind: single`). |
| `selectors[].options` | array | yes | Each `{id, label, color?}`. The `id` must appear in the CSV column matching the selector's `id`. A `title-inline` selector tints its label (and a single-line chart's line) to the option's `color` if set, else to the figure's `series_colors` entry whose key matches the option's `label`. So a shared `series_colors` (e.g. in tab `figureDefaults`) colors the selector for free. |

---

## CSV format

Every chart data file is long-format. Required columns:

| column | content |
|---|---|
| `time` | x-value. Must parse per the chart's `xAxisType`: integer for `numeric`, `YYYY-MM-DD` for `temporal`, `YYYYQ#` for `quarterly`. |
| `series` | Series identifier. Each unique value becomes a separate line on the chart. |
| `value` | y-value. Float. Can be empty for missing observations. |

Optional columns:

| column | when required |
|---|---|
| `lower_ci`, `upper_ci` | Required if a chart's `confidence_bands` references these column names. |
| `variant` | Required if the chart declares `variants`. Each row's value matches one `variants[].id`. |
| `<selectorId>` | Required if the chart declares a selector. Column name equals the selector's `id`; values match `options[].id`. |

The validator parses every row and fails the build on malformed time
values, non-numeric values, missing required columns, or referenced
keys (series, variant, selector option) that don't appear in the data.

---

## `current-update.md`

Plain markdown. Rendered to HTML at build time and embedded in
`manifest.json` for the Current Update tab.

---

## Notes

- **`series_order` filters.** Listing `series_order: [a, b]` excludes any other series in the data from rendering on that chart. Multi-chart figures (SDID) use this to point each chart at the subset it should show.
- **Adding or removing a figure means two edits.** Create / delete the folder *and* add / remove its slug from `tracker.yaml`'s nav lists. The build script fails loudly if a folder is missing from nav or a nav entry has no folder.
- **Reordering = one edit.** Move the slug within (or between) sections in `tracker.yaml`. No need to touch the figure config — `figureNum` is recomputed from list position on every build.
- **Variant default is the toggle's.** Set `default:` on `tracker.yaml`'s toggle. The chart's `variants:` list order is the silent fallback (first variant) when no toggle is in scope. There is no `default:` flag on individual variants.
- **Folder name is the figure id.** Renaming a folder is renaming the figure. Update every `tracker.yaml` reference (nav lists *and* `applies_to_figures`) to match.
