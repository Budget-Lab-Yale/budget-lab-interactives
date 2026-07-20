# Engine request: style the "projected" portion of a series (dashed line / faded area)

**Repo:** `budget-lab-chart-engine`
**Type:** feature in the chart renderer (line + area)
**Requested by:** State of Tariffs dashboard (daily statutory-rate charts)

## Problem

Time-series figures carry historical values and forward projections in one series. We want the
**projected** portion of each series drawn distinctly — dashed for lines, reduced-opacity fill
for areas — while keeping the same series color and a **single** legend entry. The data already
identifies which points are projected via a per-row flag column (`projected`, `0`/`1`).

Today the engine only supports **whole-series** dashing (`series_styles[series].dashed`,
`src/engine/marks/line.ts:40–57`, which splits data into dashed-vs-solid *by series name*).
There is no per-segment / partial-series styling and no concept of a projected/forecast region.

Note: the flag is not a clean "everything after date X" tail — a series can have **several
disjoint** projected runs (e.g. a few historical gap-fill days plus the trailing forecast). The
feature must handle multiple projected runs per series, not just one boundary.

## Desired behavior

- New spec field, e.g. `projected_field: <column>` (default off). Rows where that column is
  truthy (`1`/`true`/`yes`) are the projected segment of their series.
- **Line / area** render the projected run(s) of each series:
  - line: **dashed** (same stroke color/width as the solid part).
  - area: **reduced-opacity fill** (target ~0.2, i.e. ~80% transparent), same fill color.
- Optional `projected_style` override, e.g. `{ dashed: true, fillOpacity: 0.2 }`, with the
  above as defaults per chart type.
- **Continuity:** each projected run should visually connect to the adjacent actual run (share
  the boundary point) so the line/area reads as one continuous series, just restyled.
- **One legend entry per series** (projected styling is not a separate series and must not add
  legend rows). A single legend hint that "dashed = projected" is nice-to-have, not required.
- **Tooltip/crosshair** unchanged — same series identity; the projected flag shouldn't split
  hover behavior.

## Suggested implementation

- Thread `projected_field` through the spec → model so each datum carries an `isProjected` bit.
- **Line** (`src/engine/marks/line.ts`): within each series, split into maximal
  actual/projected runs and emit solid vs dashed sub-paths, duplicating each run's boundary
  point so segments meet. This generalizes the existing dashed-vs-solid split (which today keys
  on series name) to also split within a series on the projected flag.
- **Area** (`src/engine/marks/area.ts`): draw the projected x-range portion of each band at the
  reduced fill opacity. (Simplest correct approach may be a second, clipped fill layer over the
  projected x-range.)
- Keep legend/series enumeration keyed on the real series only, so no extra entries appear.

## Acceptance criteria

- With `projected_field: projected`, a multi-series line chart shows each series solid over
  actual points and dashed over projected points, same color, one legend entry per series,
  across multiple disjoint projected runs.
- A stacked-area chart shows the projected x-range at reduced fill opacity, same colors, no
  extra legend entries.
- Charts without `projected_field` are unchanged.

## Dashboard context

The tool already has a build-time helper (`project_band`) that shades the projected date range
as a grey annotation band; this request is the complementary **line/area** styling and is
independent of that band. The `projected` column is present on all `statutory-rates/*` series.
(Its exact semantics — why some mid-series days are flagged — is an open question with the
model team, but the engine feature just renders whatever the flag marks.)
