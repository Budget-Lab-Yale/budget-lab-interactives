# Engine note: distribution-card measure toggle simplified to fit a single stack

**Repo:** `budget-lab-chart-engine` (informational — not a bug report)
**Type:** design-fit note
**Requested by:** Revenue from higher taxes at the top (distribution card)

## Problem

The source mockup's distribution card (`scratchpad/app.code.js:419-517`, `paintDist`/
`combinedDist`/`combinedEtr`) has three measure views that a single engine `chartType: stacked`
bar can't reproduce as-is:

- **`etr` (source):** a per-group **dumbbell** — three dots on a stem (current-law baseline,
  filled ink; collected/conventional, filled accent; static/ask, hollow accent ring) — comparing
  three independent totals at once. A stack can only show components that sum to ONE total per
  category, not three totals side by side.
- **`context` / `new` (source):** dollar-denominated bars (ETR × `DATA.income_levels[incdef]`),
  split into after-tax income / current-law tax / new tax collected / lost-to-behavior (the last
  two hatched vs. solid). `computeResults`'s return value carries no income-level data, so a pure
  `buildDistSpec(results, view, incdef)` has no dollar figures to work with — only the
  percentage-point arrays in `results.etr`.

## What this tool does instead

**Superseded — this section described the tool as it was when the note was written, and the
constraint it described is gone.** `DATA.income_levels[incdef]` now reaches the render layer, so
the dollar-denominated views the note called impossible are what ship. Kept for the rationale of
the original ask; do not read it as a description of the current figures.

As of engine 1.12.0 the three views do NOT share one shape:

- `context` — `chartType: stacked`, dollars, FOUR segments partitioning a group's total income
  (after-tax income, current-law tax, new tax collected, lost to behavior).
- `new` — the same stacked dollars, TWO segments (new tax collected, lost to behavior) summing to
  the first-order estimate.
- `rate` (was `etr`) — `chartType: dumbbell`, adopted in 1.11.0: three markers per group
  (current law, first-order, collected) on a stem, not a stack at all.

Both dollar views are two-pane faceted small multiples, hatch one segment through
`series_patterns`, and author their own hover card through `hooks.tooltip`.

## Tool context

See `render/distribution.js` — `buildDistSpec` for the two dollar views and `buildRateSpec`
for the dumbbell — and `test/render.test.mjs`'s `buildDistSpec` tests for the shape they are held
to. (There is no `seriesFor`; this note named a function that no longer exists.)
