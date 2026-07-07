# Engine request: `columns.section` + `columns.facet` together garbles the layout

**Repo:** `budget-lab-chart-engine`
**Type:** bug (should work, or fail loudly) — horizontal bars
**Requested by:** State of Tariffs dashboard (consumer-prices figure)

## Problem

Setting both `columns.section` (sectioned category axis) and `columns.facet` (small multiples)
on a horizontal bar chart produces a broken render: the section spacer bands and the facet panes
interact so that every category label is repeated and overlaps, and the section headers scatter
through the panes. No error is thrown — it silently renders garbage.

Repro: horizontal bar, `columns: {x: category, facet: substitution, section: group, value}`,
`small_multiples.mode: shared`, plus `section_order`. Two facet values → the panes come out with
overlapping category labels and duplicated section bands (see the dashboard's consumer-prices
figure before we removed `section`).

## Desired behavior

One of:

1. **Support the combination** — within each facet pane, group the categories into the same
   labeled sections (shared category gutter with section headers on the left, panes to the
   right). This is a natural request: "small multiples of a sectioned category chart."
2. **Or reject it at validation** with a clear message ("section and facet cannot be combined
   on the same chart") so authors aren't surprised by a silent garble.

Option 1 is more useful; option 2 is an acceptable interim.

## Dashboard workaround

We dropped `section` and instead ordered categories by group via `x_order` (total first, then
durable / nondurable / services in sequence), so the grouping is visually implied without section
headers. Works, but loses the section labels inside the faceted view.

## Priority

Medium — the silent garble is a trap; a clear rejection (option 2) is cheap and would have saved
debugging time. Full support (option 1) is a nice-to-have.
