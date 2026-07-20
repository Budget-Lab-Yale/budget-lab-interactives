# Engine bug: first section header clips at the top of a horizontal sectioned bar chart

**Repo:** `budget-lab-chart-engine`
**Type:** layout bug (horizontal sectioned bars)
**Requested by:** State of Tariffs dashboard (consumer-prices figure)

## Problem

On a horizontal bar chart with `columns.section`, the **first** section header is lifted into
the top margin (by design, to avoid opening with an empty band). But when the chart has no
top-axis ticks (`x_axis_ticks` default `bottom`), the reserved top margin is smaller than the
header's lift, so the first section header renders above the plot's top edge and is **clipped**
(only its lower half shows, colliding with the legend above).

## Root cause

In `src/engine/marks/bar.ts`:

- `hMarginTop = (hTopTicks ? HVALUE_TICK_PX : 0) + SECTION_HEADER_GAP + (sectioned ? 12 : 8)`
  (L150). With no top ticks and `sectioned`, that's `0 + 10 + 12 = 22px`.
- `topHeaderLift = SECTION_HEADER_GAP + catFont + 5` (L156) ≈ `10 + ~13 + 5 = 28px`.

Since `topHeaderLift (≈28) > hMarginTop (22)`, the top-anchored first header baseline lands
above `y=0` and is clipped. It only looks fine when `x_axis_ticks: both`/`top` adds
`HVALUE_TICK_PX (18)` to `hMarginTop` (→ 40) — i.e. the layout currently depends on an unrelated
setting to not clip.

## Desired behavior

The first section header is fully visible regardless of `x_axis_ticks`. When there is a top
section header, `hMarginTop` should reserve at least `topHeaderLift` (plus a small pad), so the
header never depends on top ticks for its room.

## Suggested fix

In `bar.ts`, when `topSectionHeader` is present, floor the top margin to the header lift, e.g.:

```
const hMarginTop = Math.max(
  (hTopTicks ? HVALUE_TICK_PX : 0) + SECTION_HEADER_GAP + (sectioned ? 12 : 8),
  topSectionHeader ? topHeaderLift + SECTION_HEADER_GAP : 0,
);
```

(Compute `topHeaderLift` before `hMarginTop`, or inline the value.)

## Acceptance criteria

- A horizontal sectioned bar chart with default (`bottom`) ticks shows its first section header
  fully, not clipped, with sensible spacing to the first bar.
- `x_axis_ticks: both`/`top` still render correctly (no double gap).
- Unsectioned and vertical charts unchanged.

## Dashboard workaround

The consumer-prices figure sets `x_axis_ticks: both` to force enough top margin. That's also a
reasonable look for a tall chart, so it can stay — but it shouldn't be *required* to avoid the
clip.
