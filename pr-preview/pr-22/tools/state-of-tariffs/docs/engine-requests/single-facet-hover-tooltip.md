# Engine request: single-pane small-multiples falls back to the legacy tooltip (wrong swatch color)

**Repo:** `budget-lab-chart-engine`
**Type:** fix (bars — hover)
**Requested by:** State of Tariffs dashboard (gdp-by-category "by country")
**Priority:** Low (worked around tool-side)

## Problem

A `small_multiples` chart whose facet channel resolves to a **single value** (one pane) does not
get the 1.3.x bar hover (a shade band + bar-end value pill matching the rendered fill). Instead it
falls back to the **legacy floating tooltip** (`.tbl-tooltip`) — the pre-1.3.0 behavior that
standalone and multi-pane faceted charts no longer use.

Worse, that legacy tooltip colors its swatch from the **series** color, ignoring the bar's actual
rendered fill. Repro: gdp-by-category "by country" is `columns:{x,facet:group,value}` +
`small_multiples`, with one `group` value ("Countries") and bars colored via `bar_color: amber`.
Hovering shows the floating tooltip with a **blue** (`#0072B2`, the default series color) swatch,
not amber. The multi-pane "by sector" view (two groups) hovers correctly (pill, no tooltip).

## Two defects here

1. **Single-pane facet path** uses the legacy tooltip instead of the standard bar hover. A facet of
   size 1 should render/behave like the standalone chart (which already got the pill in 1.3.0).
2. **Legacy tooltip swatch uses the series color, not the rendered fill.** Even where the legacy
   tooltip is intentionally shown, its swatch should color-match the actual bar fill
   (`bar_color` / `category_colors` / accent), the way the 1.3.x value pill already does.

## Workaround in the tool today

The render layer drops `columns.facet` + `small_multiples` when the facet resolves to ≤1 distinct
value, so the chart mounts as standalone and gets the correct pill hover + fill-matched color.

## Acceptance criteria

- A `small_multiples` chart with a single facet value hovers with the shade + bar-end value pill
  (no floating tooltip), identical to the standalone chart.
- Any swatch/pill shown on hover color-matches the bar's rendered fill, not the series color.
