# Engine request: all-zero stacked bar renders full-height instead of empty

> **FIXED in engine 1.7.0**, re-verified against the 1.11.0 pin: `scales.ts`
> `floorDegenerateExtent` floors a collapsed `[0,0]` extent to `[0,1]`, and an all-zero stack now
> renders its bars at `height="0"`. The card still short-circuits to an empty-state sentence before
> mounting, but that is now an editorial choice — a sentence telling the reader to turn a policy on
> beats an empty frame with a flat zero line — not a workaround. Kept as a record only.

**Repo:** `budget-lab-chart-engine`
**Type:** bug (bar/stacked rendering)
**Requested by:** Revenue from higher taxes at the top (distribution card)

## Problem

A `chartType: stacked` chart whose rows are ALL exactly `0` (every series, every category)
renders every bar at full plot height, in a single series' color, each labeled `0%`. It reads as
real, sizable data — not as "nothing to show" — which is actively misleading.

Reproduced with the vendored engine 1.4.1: a 10-category × 5-series stacked bar where every
`value` is `0` renders as 10 full-height red (last-in-`series_order`) bars, each with a `0%`
value label, rather than 10 zero-height (invisible) bars.

A dataset that is zero in SOME categories but not others renders correctly (those categories
draw as zero-height, no visible bar) — the bug is specific to the whole chart's y-domain being
degenerate (`[0, 0]`).

## Desired behavior

When the resolved y-domain collapses to `[0, 0]` (or all in-scope values are `0`), stacked bars
should render as zero-height (i.e., invisible, matching the value) rather than falling back to
full plot height. The axis/gridlines can render normally (e.g., a flat `0%` line across the top).

## Suggested implementation

In the stacked-bar y-scale construction, guard the zero-span case explicitly (e.g., `domain =
[0, max || 1]` is likely already used to avoid a literal divide-by-zero, but the `max || 1`-style
fallback is then also used to size the BARS, not just the axis range — bars should scale against
the real `max` of `0`, i.e., render at `0` height, independent of whatever floor value keeps the
axis scale itself finite).

## Acceptance criteria

- A stacked-bar dataset where every row's value is `0` renders every category as zero-height
  (no visible fill), not full-height.
- A stacked-bar dataset where only some categories are all-zero is unaffected (already correct).
- Existing non-degenerate stacked-bar snapshots unaffected.

## Tool context

The distribution card's "New taxes added by the plan" measure is legitimately all-zero the
moment a user opens that tab before turning on any policy lever (or toggles a continuous lever
on without moving its dial off current law) — a very reachable first-touch state, not a corner
case. Worked around tool-side today: `render/distribution.js`'s `mountDistribution` detects an
all-zero row set and shows a plain "No new taxes yet" message instead of calling
`engine.mountChart`, so the misleading full-height bars never reach the user. That workaround
should be removable once this is fixed upstream.
