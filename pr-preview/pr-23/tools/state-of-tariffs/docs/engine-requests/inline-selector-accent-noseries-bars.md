# Engine request: apply the inline-selector color accent to no-series bar charts

**Repo:** `budget-lab-chart-engine`
**Type:** enhancement / consistency (bars + inline title selector)
**Requested by:** State of Tariffs dashboard (gdp-by-category, default scenario)
**Follows:** the inline title selector (`title_selectors`) + `accentColor` feed shipped in 1.3.0

## Problem

An inline title selector whose active option has a `color` tints the selector's trigger label
**and** — per the AILMT parity feature — recolors the chart to that color via `accentColor`. But
the recolor only fires for a chart that resolves to exactly one **series**:

```ts
// src/engine/index.ts
if (opts.accentColor && seriesNames.length === 1) {
  colors.set(seriesNames[0]!, opts.accentColor);
}
```

A **no-series bar chart** — one with no `columns.series`, colored by `bar_color` (or the default)
— doesn't take that path (`seriesNames.length !== 1`), so the option color tints the **title
label but not the bars**. The label and bars disagree: e.g. a "GDP by [Sector]" picker where
"Sector" reads blue in the title while the bars stay the default fill.

Concretely: `gdp-by-category` (default scenario) is a single-series-free bar chart
(`columns: {x, facet, value}`, no `series`) with a `{dimension}` title selector whose options are
`sector` (blue) / `country` (amber). The selector label recolors; the bars do not.

## Workaround in the tool today

The render layer reads the active option's `color` and writes it to `spec.bar_color` before
mounting, so the bars match the label. Works, but it means the tool re-implements the accent feed
for a case the engine already handles for series charts — and only because the tool owns the
re-render on selection. A standalone embed (engine renders the selector, no host) gets a tinted
label with un-tinted bars.

## Desired behavior

- When a bar chart has no `series` (single implicit series colored via `bar_color`/default) and an
  `accentColor` is in force, apply the accent to the bar fill — the bar analogue of the
  single-series recolor. `category_colors` (e.g. a Total in gray) must still override per-category
  on top of the accent.
- Behavior for multi-series charts is unchanged (they keep their palette/`series_colors`).

## Suggested implementation

In the bar mark's single-series fill resolution (`src/engine/marks/bar.ts`, the
`seriesNames.length === 1 ? singleFillFor(...) : barColorOverride ?? TBL.color.blue` branch),
let `accentColor` win over `bar_color`/default when present — i.e. the effective base fill for a
no-series bar is `accentColor ?? bar_color ?? default`, with `category_colors` applied on top as it
is today. Equivalently, treat the no-series bar as the "one series" case for the
`index.ts` accent assignment.

## Acceptance criteria

- A no-series bar chart with a colored inline title selector recolors its bars to the active
  option's color, matching the tinted selector label, with no host involvement.
- `category_colors` still overrides named categories (a gray Total stays gray).
- Multi-series bar charts and charts without `title_selectors`/`accentColor` are byte-identical to
  today.
