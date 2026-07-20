# Engine request: apply the inline-selector color accent to faceted (small-multiples) bar charts

**Repo:** `budget-lab-chart-engine`
**Type:** enhancement / consistency (bars + inline title selector + small multiples)
**Requested by:** State of Tariffs dashboard (gdp-by-category)
**Priority:** Low
**Follows:** `inline-selector-accent-noseries-bars.md` (delivered for standalone in 1.3.1 @ `36995da`)

## Problem

The inline-selector color accent recolors a chart to the active `title_selectors` option's color.
1.3.1 extended it to standalone no-series bars, but a **faceted** chart (`small_multiples`) still
omits it by design — only the title label tints, the per-pane bars keep their base fill:

```ts
// src/engine/render-live.ts (MountOptions.afterChange TSDoc)
// "mountFigure (small multiples) omits this: the label still tints, but the per-pane grid isn't
//  re-rendered — each pane is one facet's chart body … and this port does not touch figure.ts."
```

Repro: `gdp-by-category` is faceted (`columns.facet: group`; the "by sector" view splits into a
"Manufacturing detail" pane, so faceting is intrinsic). Its `{dimension}` selector options are
`sector` (blue) / `country` (amber). The selector label recolors; the per-pane bars do not.

Two code facts behind this:
1. The standalone path (`draw()`) computes `accentColor` from `title_selectors` + `selections`
   and passes it to `renderChart`. The faceted path (`mountFigure` → `renderFigure`, entered at
   `render-live.ts` `if (opts.spec.small_multiples) return mountFigure(...)`) never computes or
   threads `accentColor` to the per-pane `renderChart` calls.
2. `afterChange` (fired on a selection change) drives `requestAccentRedraw`, which only re-renders
   the standalone body — the faceted pane grid is not re-rendered.

## Workaround in the tool today

The render layer copies the active option's `color` into `spec.bar_color` before mounting, so the
faceted panes color correctly (and re-render because the host owns the re-render on selection).
`category_colors` (a gray Total) still overrides on top. Works, but a standalone engine embed of a
faceted chart with a colored selector would show tinted label + un-tinted bars.

## Desired behavior

- When a faceted bar chart has a colored active `title_selectors` option, each pane's bars adopt
  the accent — the per-pane analogue of the standalone single/no-series recolor. Multi-series panes
  keep their palette/`series_colors`; `category_colors` still overrides per-category.
- A selection change re-renders (or recolors) the pane grid so the accent updates live, matching
  the label.

## Suggested implementation

1. In `mountFigure` (the `small_multiples` branch of `renderLive`), compute `accentColor` the same
   way `draw()` does — `resolveColor(resolveActiveOptionColor(spec.title_selectors, selections,
   spec.series_colors))` — and pass it through `renderFigure`'s `RenderOptions` to each pane's
   `renderChart` (which already honors `accentColor` for single/no-series bars as of 1.3.1).
2. Wire the faceted path's `afterChange` to re-render (or recolor) the pane grid on selection
   change, so the accent tracks the active option like the standalone body already does.

## Acceptance criteria

- A faceted no-series (or single-series) bar chart with a colored inline title selector recolors
  every pane's bars to the active option's color, live on change, with no host involvement.
- `category_colors` still overrides named categories (a gray Total stays gray); multi-series panes
  are unchanged.
- Lets the dashboard drop the `bar_color`-from-option-color bridge for `gdp-by-category`.
