# Engine note: three-rung bars per category + reorderable rows

**Repo:** `budget-lab-chart-engine` (informational — not a bug report)
**Type:** design-fit note (§9: known engine gap, built as custom SVG)
**Requested by:** Revenue from higher taxes at the top ("How policies stack" view)

## Problem

The "How policies stack" view (`render/stack.js`) needs three things no vendored `ChartSpec`
mark expresses:

1. **Three bars per category, sharing one baseline and x-scale.** Each row shows the same
   revenue on three rungs — the first-order tax change, plus mechanical tax-base interactions,
   plus behavioral response — so their lengths are directly comparable at a glance. The rungs are
   distinguished within their tax base's hue by tint tier *and* by thickness: the two upper rungs
   are 14px, the collected "+ behavioral effects" rung 28px (`RUNGS` in `render/stack.js`). The
   thickness is semantic, not decoration — the collected rung is the score the reader came for and
   carries the row's largest number, so the eye should land on it before the workings above it. A
   mark that drew all three at one weight would not express this view. The closest engine mark,
   `stacked`, draws one bar per category.
2. **Diverging segments within each rung.** A base can be *drained*: positive segments accumulate
   rightward from zero, negative ones leftward, independently, in the same row.
3. **User-reorderable categories that persist.** Rows are dragged (pointer-based, grip handle) to
   reorder the policy list, and the order is retained across re-renders. No `ChartSpec` field
   describes a user-mutable category order — `x_order`/`series_order` are author-supplied and
   static per render. Here reordering also *recomputes* the rows (below), not just their positions.

## What this tool does instead

Hand-built SVG per row (`rowBarSvg`/`barSvg`/`gridSvg`), on `--tbl-*` tokens: a `<line>` grid and one
`<rect>` per tax-base segment per rung, positioned from the single `RUNGS` table so the bars, their
rung tags and their numbers cannot drift apart. Every gridline is solid 1px; the zero line is set
apart by token (`--tbl-axis-stroke` against `--tbl-gridline`) rather than by a dash, because the
engine reserves dashes for reference-line markers and a dashed gridline would read here as an
annotation. Segment fill is `headColor(head, step)` from `render/shared.js`, which resolves the
base's hue at the rung's step on that hue's three-step light-to-dark ladder — palette tokens rather
than opacity-derived tints, so segments stay legible over gridlines and rasterize identically in the
PNG export. A separate per-rung opacity (0.55 / 0.75 / 1, knocked back a further notch for a drained
segment) holds the two workings rungs behind the score; the export writes it as an `opacity`
attribute so the raster matches the screen.
Drag-to-reorder is native `pointerdown`/`pointermove`/`pointerup` (`wireStackDrag`) with no engine
involvement; the app owns the order array and re-mounts on every move.

Rows come from `model.stackMarginals(s, order, dec)`: an order-DEPENDENT cumulative-prefix
waterfall over the by-head `'sh'`/`'mh'`/`'ch'` surrogate quantities. A row's values are its
marginal contribution *given the rows above it*, so dragging genuinely changes which row absorbs a
shared interaction, and the rows always telescope to the same whole-package total for any order.
The "Whole package" row is that final prefix (`pkg`) directly.

An order-independent Shapley attribution was built first and rejected: it collapsed each row to a
single net value per policy, flattening the per-base drains and making dragging cosmetic. Sylva's
report — the stack "is just showing the revenue raised, not the complexity of losses and
interactions" — is what sent it back to the prefix waterfall. `results.phi`/`phiStatic` are still
computed by `computeResults`, but nothing in the render layer reads them any more; only
`test/model.test.mjs` exercises `shapley` directly.

The PNG/SVG download (`render/export.js` + `buildStackExportSvg`) is a from-scratch, literal-color
re-render of the same layout data, for the same two reasons: no engine mark to hand it to, and a
downloaded or rasterized SVG cannot resolve this page's `var(--tbl-*)` custom properties.

## What would close the gap

- **A `paired-bar` or `banded-bar` mark**: N bars per category sharing one baseline and x-scale,
  each independently styled (tint tier, opacity, and bar thickness — the thickness carries meaning
  here, not just emphasis), with diverging segments per bar — would cover
  this view AND the distribution card's deferred dumbbell need
  (`distribution-measure-simplification.md`).
- **A user-mutable category order in `ChartSpec`**, or at minimum a documented pattern for an
  engine-rendered chart to accept and re-emit a drag-reordered category list. Note this view also
  needs the reorder to trigger a *data* recompute, not just a redraw, so a purely presentational
  reorder hook would only close part of the gap.
- Neither is close to the engine's current bar-mark model (`src/engine/marks/`), which assumes one
  bar per category and an author-fixed order. This is a capability gap, not a bug.

## Tool context

See `render/stack.js` (`RUNGS`, `layoutStack`, `mountStack`) and `test/render.test.mjs`'s
`layoutStack`/`RUNGS` tests for the per-row geometry, and `test/model.test.mjs` for the
telescoping and order-dependence identities the view relies on. The rungs' exact visual weight and
drag polish are still expected to need tuning in a later pass.
