# Chart-engine change requests

Requests for the `budget-lab-chart-engine` repo, gathered while building the distribution card
for Revenue from higher taxes at the top. Each file is a self-contained, implementation-ready
spec (problem → desired behavior → suggested implementation → acceptance criteria). Hand off as
a set.

**Vendored engine: 1.12.0.** Status below is as of that pin.

## Open

| Spec | Summary | Priority |
|---|---|---|
| [distribution-measure-simplification.md](distribution-measure-simplification.md) | Not a bug: documents where the distribution card's engine-stacked-bar reproduction diverges from the source mockup's dumbbell/dollar views, and what engine features would close the gap. | Info |
| [stack-static-vs-behavioral-overlay.md](stack-static-vs-behavioral-overlay.md) | Not a bug: the "How policies stack" view's three rungs per row (first-order / +mechanical / +behavioral, the collected rung drawn at double thickness because it is the score), its diverging per-base segments, and its drag-reorderable rows have no engine mark equivalent; built as hand-rolled SVG. | Info |

## Closed

| Spec | Status |
|---|---|
| pattern-fill-for-a-series.md | **Shipped in 1.11.0** as `series_patterns` ([engine#26](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/26), PR #28). Adopted: `render/distribution.js` declares `series_patterns: { lostToBehavior: '/' }`. The CSS override and its hand-rolled `<pattern>` are deleted. |
| stacked-segment-gap.md | **Shipped in 1.11.0** as `barStack.segmentGap` ([engine#27](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/27), PR #28). Adopted: `barStack.segmentGap: 1`, matching the stack figure's own 1px inset. The background-coloured-stroke override is deleted. |
| dumbbell-chart-type.md | **Shipped in engine 1.7.0**, adopted at the 1.11.0 repin. The rate view is `chartType: dumbbell` (`buildRateSpec`); its hand-rolled SVG, legend, tooltip and CSS are deleted. What forced it: the hand-rolled legend borrowed `.tbl-legend-swatch.is-dot`, which 1.11.0 retired when every key moved to SVG, so its dots became squares. |
| stacked-tooltip-without-net-dot.md | **Shipped in 1.12.0** as `barStack.hover` ([engine#29](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/29)). Adopted: `barStack.hover: 'tooltip'` buys the card with `netDisplay: 'none'`, so no net dot reaches the export. `barStack.total` also lands the Total-row ordering natively, though this card authors its own content instead. |
| tooltip content hook | **Shipped in 1.12.0** as `hooks` + `chrome` ([engine#30](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/30)). Adopted: `hooks.tooltip` authors both figures' cards, `hooks.tickLabel` does the thousands separators, `chrome.valuePills: false` turns off the on-mark numbers. The hand-rolled hit-testers, the MutationObserver and every CSS override are deleted. |
| all-zero-stack-full-height.md | **Fixed in engine 1.7.0** (`scales.ts` floors a degenerate `[0,0]` extent); re-verified against 1.11.0 — an all-zero stack renders bars at height 0. The card still short-circuits to an empty-state sentence, now as an editorial choice rather than a bug workaround. |

The two 1.11.0 keys reach the PNG export, which is what a consumer's stylesheet could never do.
With the dumbbell adopted, the only hand-rolled FIGURE left is the stack — and it is hand-rolled
because no engine mark can express it, not because of a version pin.

**No engine override remains, and nothing is hand-rolled that the engine can do.** Every request this
tool filed has shipped, and customisation now goes through a supported surface — `hooks`, `chrome`,
and the spec — rather than rewriting rendered DOM.

Four *dependencies* on engine class names do remain, and they are dependencies rather than overrides:
the card suppresses `.figure-titlebar`/`.figure-subtitle` inside `#distChart` (and zeroes
`.figure-card`'s margin there) because it draws its own header; `index.html` titles both cards with
`.figure-supertitle`/`.figure-title`/`.figure-subtitle`; `render/stack.js` builds its download control
out of `.figure-meta`/`.figure-meta-text`/`.figure-downloads`/`.figure-download-btn`; and `tipCard`
emits the engine's `.tbl-tooltip-*` classes so its card is styled by the vendored stylesheet in both
hosts. All four are pinned by `test/render.test.mjs`, which fails if the engine stops defining them.
The two that borrow engine markup wholesale — the card headers and the download control — carry no
look of their own, so a dropped class would leave them unstyled rather than broken, which is exactly
the 1.11.0 failure mode again.

The one thing to re-check on every repin is in the repo's `## Hard invariants`: both figures are
two-pane coordinated small multiples, and a coordinated pane normally draws **no** hover card. What
buys it back is `barStack.hover: 'tooltip'` on the stacked views plus the engine's own behaviour for
a faceted dumbbell. Verified against 1.12.0 by mounting all three real specs in jsdom with the
engine's `mockRect1to1` harness. If a future release changes that, all three hover cards disappear
with no error — the same shape of silent break as 1.11.0 retiring `.tbl-legend-swatch.is-dot`.
