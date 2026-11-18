# Engine request: whitespace between stacked segments

> **SHIPPED in engine 1.11.0 (PR #28) and adopted here.** `render/distribution.js` sets
> `barStack.segmentGap: 1`, matching the 1px inset the stack figure gives its own segments. It
> landed as subtractive geometry with the floor this request asked for — verified against 1.11.0, a
> slice thinner than the gap renders at `height="0.5"` rather than being painted over — and it
> reaches the PNG export. The background-coloured-stroke override below is deleted. Kept for the
> rationale, not as a live request.

**Filed:** [budget-lab-chart-engine#27](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/27)
**Repo:** `budget-lab-chart-engine`
**Type:** feature request (§9: engine gap, partially worked around in the tool)
**Requested by:** Revenue from higher taxes at the top (Distribution card)
**Vendored engine:** 1.4.1 — unchanged in `main` at 1.10.0 (`src/engine/marks/stacked.ts:242`)

## Problem

Stacked bars render as abutting rects:

```ts
const stackMark = horizontal
  ? Plot.barX(stackData, { y: catField, x: "_y", fill: fillChannel })
  : Plot.barY(stackData, { x: catField, y: "_y", fill: fillChannel });
```

Fill only — no inset, no stroke, no spec key for either. Adjacent segments share an edge exactly, so
the boundary between them is carried entirely by the hue change. That works when neighbouring
segments are far apart in the palette and fails when they aren't: two slices from one hue family read
as a single block.

## Where it bites

The two figures on this page sit in one column and disagree:

- **The stack figure** (`render/stack.js`, hand-rolled SVG) insets every segment by 1px,
  `Math.max(0.5, w - 1)`. The floor matters — a slice narrower than the inset still renders as a
  hairline instead of vanishing.
- **The distribution card** (engine `chartType: stacked`) can't, so its slices abut. Its
  `collectedNew` / `lostToBehavior` pair is `blue` over `blue-200` — one hue, two steps — which is
  exactly the case that needs the separation.

## What this tool does today (override 4 in styles.css)

```css
#distChart rect[data-series] { stroke: var(--tbl-bg); stroke-width: 1; }
```

Each rect paints a 1px border in the page background; half of it falls outside the shared edge, so
adjacent segments end up 1px apart, and on the bar's outer boundary the stroke is invisible against
the same background. Two things it can't do, and they are the reason to fix this upstream:

1. **It paints over the segment rather than shrinking it**, so a slice thinner than the stroke is
   swallowed entirely — the opposite of the stack figure, which floors its inset. CSS has no
   "inset the geometry, but not past zero."
2. **It never reaches the PNG export**, which re-renders from the spec rather than serializing the
   DOM — the same limitation recorded in
   [stacked-tooltip-without-net-dot.md](stacked-tooltip-without-net-dot.md) and
   [pattern-fill-for-a-series.md](pattern-fill-for-a-series.md).

It also assumes a flat, known page background; on a tinted card the stroke becomes a visible outline
rather than a gap.

## Requested change

```yaml
barStack:
  segmentGap: 1        # px; 0 = today's behavior, and the default
```

Implemented as geometry, not paint: inset each segment along the stacking axis, floored so a segment
never inverts or disappears (`max(0.5, extent - gap)`, the rule `render/stack.js` uses). Plot's bar
marks already take `insetTop`/`insetBottom`/`insetLeft`/`insetRight`, so this is largely deriving an
inset from `segmentGap` on the stacking axis and applying the floor where segment extents are
computed.

- The gap goes **between** segments only, not at a bar's outer ends — bars still start at the
  baseline and end at their total.
- Both orientations, insetting along whichever axis is the stacking axis.
- The net-total marker sits at the true total and must not move.

## Acceptance criteria

- [ ] `barStack.segmentGap: N` separates adjacent segments by N px on screen and in the PNG export,
      in both orientations.
- [ ] The gap is subtractive and floored: a segment thinner than the gap still renders.
- [ ] No gap at the outer ends of a bar; totals and baseline unmoved.
- [ ] Omitting the key, or `0`, renders byte-identically to today.
- [ ] 100%-normalized stacks and small-multiples panes honour it the same way.
