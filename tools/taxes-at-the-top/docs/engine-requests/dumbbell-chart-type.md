# Engine feature spec: `dumbbell` chart type (vertical + horizontal)

**Repo:** `budget-lab-chart-engine`
**Type:** new chart type (feature spec — for engine implementation)
**Requested by:** Revenue from higher taxes at the top (distribution card, "effective rate" view)
**Status:** **SHIPPED and adopted.** `chartType: dumbbell` landed in engine **1.7.0** — after the
1.4.1 pin this view was built against, which is why it carried a custom-SVG stand-in for so long.
Adopted at the 1.11.0 repin: `render/distribution.js buildRateSpec` builds the spec and
`mountDumbbell` is a thin `mountChart` call. The hand-rolled `paneSvg`, `legendHtml` and
`colorForMarker` are deleted, along with the view's bespoke tooltip and CSS.

What forced the move: the hand-rolled legend borrowed the engine's own
`.tbl-legend-swatch.is-dot` class, and 1.11.0 retired the five swatch classes when it moved every
key to SVG — so the legend's dots silently became squares. A hybrid that styles itself from another
component's internals breaks exactly this way. 1.11.0 also made `series_marker: hollow` a genuine
hole rather than an opaque white disc, which is what this view wanted from the start (the ring is
the ask, the filled dot is what is collected, and the stem between them is the subject).

## Motivation

Several Budget Lab figures compare, per category, **two or three independent point values that do not sum** — e.g. an effective tax rate under current law vs. a policy's static rate vs. the rate actually collected after behavior. A bar or stacked bar can't express this: a stack shows components of one total; a grouped bar burns horizontal space and reads as magnitudes rather than a before/after gap. The natural encoding is a **dumbbell** (a.k.a. connected dot plot): one row/column per category, a dot per series, and a connector "stem" spanning them so the **gap** is the visual subject.

Concretely, the tool's distribution "effective rate" view shows, for each income group: current-law rate (baseline), the package's static rate ("ask"), and the rate collected after behavior. The reader's question is "how big is the gap between the ask and what's collected, and how does that vary across the distribution" — a dumbbell answers it directly.

## Chart type

`chartType: dumbbell`. Like `bar`/`stacked`, it plots a **numeric value axis** against a **categorical axis**, but renders each category's rows as dots joined by a connector instead of bars.

### Orientation (both required)

- `orientation: horizontal` — categories run down the **y** axis, values along **x**; each category is a horizontal stem with dots. (Best when category labels are long, e.g. income-group names.)
- `orientation: vertical` — categories run along the **x** axis, values up **y**; each category is a vertical stem with dots.

Axis-type constraints mirror the existing bar rules: the categorical axis is `categorical`; the value axis is numeric. For `horizontal`, `yAxisType: categorical`; for `vertical`, `xAxisType: categorical`.

## Data shape

Tidy long rows, one row per (category, series):

| column role | meaning |
|---|---|
| `category` | the dumbbell row/column (e.g. income group) |
| `series` | which dot within the category (e.g. `current_law`, `static`, `collected`) — 2 or 3 typical, N supported |
| `value` | the numeric position of that dot on the value axis |

Mapped via `columns: { category, series, value }` (consistent with the bar chart's `columns`). The connector for a category spans the min→max of that category's dot values.

## Config fields

| field | type | notes |
|---|---|---|
| `chartType` | `"dumbbell"` | |
| `orientation` | `"horizontal" \| "vertical"` | default `horizontal` |
| `columns.category` / `.series` / `.value` | string | row-field names |
| `category_order` | string[] | order of stems along the categorical axis |
| `series_order` | string[] | draw/legend order of the dots |
| `series_labels` | map | legend/tooltip display names per series |
| `series_colors` | map | per-series dot color (defaults to the `--tbl-cat*` ramp) |
| `series_marker` | map series→`"filled" \| "hollow" \| "ink"` | dot style: solid fill, hollow ring (outline in series color, page-background center), or filled ink/neutral. Lets "static/ask" read as hollow and "collected" as filled, per the motivating view. Default all `filled`. |
| `connector` | `{ color?, width?, style? }` | stem styling; default a light `--tbl-border`/muted 1.5px solid line behind the dots |
| `value_axis_title` | string | conventional axis-title placement (see Layout) |
| `value_format` | format spec | reuse the engine's existing number-format object (`{type, decimals, prefix, suffix}`) |
| `dot_radius` | number | default from theme; dots sized consistently across a facet |
| `gap_annotation` | bool \| `{ series_a, series_b, format }` | optional: label the numeric gap between two named series on each stem (e.g. static − collected). Default off. |
| `legend` | bool | standard engine legend (one swatch per series, honoring `series_marker` so hollow reads as a ring). Default on for ≥2 series. |
| `annotations` | (existing) | reference lines / points should compose as they do for bars. |

## Faceting (required for this use)

`dumbbell` MUST compose with `columns.facet` (small-multiples), exactly as bars do. The distribution card needs the **top-decile breakout (Top 10 / 5 / 1 / 0.1 / 0.01%) as a separate facet pane** from the main quintiles, sharing series/colors/legend and (by default) a common value scale across panes. Per-facet value scales should be available via the same option bars already expose.

## Interaction & export

- **Hover:** per-dot hover surfaces `{series_label}: {value}` (and the stem's gap if `gap_annotation` is on), using the engine's existing shared-tooltip mechanism — not a bespoke tooltip.
- **Export:** inherits the engine's standard PNG/SVG export and download-name plumbing, same as every engine chart.
- **Crosshair/legend:** legend toggling and hover should behave consistently with the line/bar types.

## Layout (conventional — no bespoke placement)

Value-axis title, category labels, and legend use the engine's **standard positions** (axis title along the value axis; legend in the engine's normal legend slot). This spec deliberately does not prescribe the source tool's hand-placed chrome — the point of moving into the engine is to get conventional, consistent Budget Lab layout for free.

## Edge cases

- **2 vs 3+ dots:** N series per category; connector spans min→max. Single dot → just the dot, no stem.
- **Negative values:** value axis includes zero when the data crosses it; a zero rule renders like the bar chart's.
- **Missing series for a category:** render present dots; connector spans what exists.
- **Overlapping dots** (near-equal values): draw in `series_order`; hollow/ink styling keeps them distinguishable; consider a tiny dodge only if exactly coincident.

## Examples

Horizontal (income groups down the y axis), the motivating rate view:

```yaml
chartType: dumbbell
orientation: horizontal
yAxisType: categorical
columns: { category: group, series: measure, value: rate }
category_order: [Quintile 1, Quintile 2, Quintile 3, Quintile 4, Quintile 5]
series_order: [current_law, static, collected]
series_labels:
  current_law: Current law
  static: Static rate (before behavior)
  collected: Rate collected after behavior
series_marker: { current_law: ink, static: hollow, collected: filled }
value_axis_title: Effective tax rate
value_format: { type: number, decimals: 1, suffix: "%" }
gap_annotation: { series_a: static, series_b: collected }
```

```csv
group,measure,rate
Quintile 1,current_law,2.1
Quintile 1,static,2.1
Quintile 1,collected,2.1
Quintile 5,current_law,28.4
Quintile 5,static,34.9
Quintile 5,collected,32.6
```

Vertical is the same spec with `orientation: vertical` and `xAxisType: categorical`.

## Open questions for the engine team

1. Is `series_marker` (filled/hollow/ink) the right knob, or should hollow/ink be derived from `series_order` position by convention?
2. Should `gap_annotation` live here or be a general annotation that targets two marks?
3. Default common vs per-facet value scale for dumbbell facets — match whatever bars currently default to.

## Interim tool-side implementation (this tool, until the engine ships it)

The tool renders the rate view as a custom SVG dumbbell built from the **same tidy shape** above (`group`, `measure` ∈ {current_law, static, collected}, `rate`), styled with `--tbl-*` tokens and conventional layout. When the engine mark lands, the tool swaps its custom render for `mountChart` with the config above and deletes the custom code — no data reshaping required.
