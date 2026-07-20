# Engine request: color a single category (e.g. a Total) and a single-series bar

**Repo:** `budget-lab-chart-engine`
**Type:** feature (bar color)
**Requested by:** State of Tariffs dashboard (gdp-by-category total, distribution total)

## Problem

Bar fill is keyed by **series** only. Two common needs have no clean expression:

1. **Color one category differently** — e.g. render an "Overall"/"Total" bar in a distinct hue
   from the component bars in the same single-series chart. There's no per-category (per-datum)
   fill; `highlightSeries` is series-level, and there's no category-level color map.
2. **Color a single-series chart** — a chart with no `series` column fills with the default
   blue; the only way to recolor is `series_colors: {"": "<color>"}` (the empty single-series
   key), which is obscure.

## What we do today (workarounds)

- Total-as-distinct-color: promote the total rows to their own series (`as_series`) so it picks
  up a `series_colors` entry — but that turns a clean single-series bar into a grouped one, or we
  encode the color dimension into the series and remap 4 keys (distribution). Fiddly.
- Single-series color: `series_colors: {"": "amber"}`.

## Desired behavior

- A **`category_colors`** map (`{ <categoryValue>: color }`) for bar `x` categories, overriding
  the series fill for those categories — so a `Total` category can be, say, navy while the rest
  stay blue, in a single-series chart.
- A first-class **single-series color** (e.g. `bar_color` / `series_colors` accepting a default),
  so authors don't reach for the empty-string key.

## Acceptance criteria

- A single-series bar chart can color one named category distinctly via `category_colors`,
  without introducing a second series.
- A single-series bar chart can set its bar color without the `{"": …}` idiom.

## Dashboard context

gdp-by-category renders the overall `Total` as the left-most bar (a real data row) alongside the
per-sector/per-country bars, colored `amber` for the whole single series via `series_colors:
{"": amber}`. We want that `Total` bar in a distinct gray to read as a summary; there is no way to
color one category in a single-series bar today. `category_colors: {Total: gray}` would do it.
