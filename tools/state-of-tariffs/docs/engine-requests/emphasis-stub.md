# Engine request: emphasis should cover the stub cell (whole-row emphasis / total rows)

**Repo:** `budget-lab-chart-engine`
**Type:** small bug/enhancement in the table renderer
**Requested by:** State of Tariffs dashboard (uses `emphasis_rows` for a table's Total row)

## Problem

`emphasis_rows` (and a truthy `emphasis_column`) is documented as rendering a row
"bold/highlighted", but it only styles the **value cells** — the row's **stub (row-label) cell**
is left plain. So a Total row shows bold, grey-highlighted numbers next to a normal-weight,
un-highlighted "Total" label; the row doesn't read as one unit.

The two renderers are also inconsistent:

- **HTML (live)** — the stub `<th>` never gets emphasis. Value `<td>`s get `.is-emphasis`
  (bold + `--tbl-bg-subtle`). See `src/table/render-html.ts` (stub th ~L174 with class
  `tbl-table-stub`; value cell emphasis at L208–209).
- **SVG (PNG export)** — already bolds the stub for an emphasized row
  (`src/table/render-svg.ts:299`, `stubWeight = row.cells.some(c => c.emphasis) ? 700 : 400`),
  but does not appear to draw the stub's highlight background. So the stub is bold in the PNG
  but not in the live table — they diverge.

Root cause: emphasis is modeled **per value cell** only (`src/table/model.ts:220–222`, set on
the cells built from `leaves`); there is no row-level emphasis and the stub is never marked.

## Desired behavior

A row named in `emphasis_rows` renders as a single consistent style across the **whole row,
stub included** — bold + `--tbl-bg-subtle` highlight — identically in the live HTML table and
the SVG/PNG export.

(`emphasis_column` stays per-cell — it flags individual cells, so it should not force the stub.
Only whole-row `emphasis_rows` should emphasize the stub.)

## Suggested implementation

Prefer a single source of truth over each renderer re-deriving it:

1. **Model** (`src/table/model.ts`): add `emphasis?: boolean` to `BodyRow` (L8) and set it when
   the row label is in `emphasisRows` (the set built at L185). Keep the existing per-cell
   `cell.emphasis` for `emphasis_column`.
2. **HTML** (`src/table/render-html.ts`): when `row.emphasis`, add `is-emphasis` to the stub
   `<th class="tbl-table-stub">` (and to group-stub cells if a group row can be emphasized). The
   existing `.is-emphasis` CSS (`src/embed/styles.ts` ~L820: bold + `--tbl-bg-subtle`) then
   applies unchanged.
3. **SVG** (`src/table/render-svg.ts`): drive `stubWeight` off `row.emphasis` (instead of
   `row.cells.some(...)`) and draw the same highlight background rect behind the stub cell that
   emphasized value cells get, so the PNG matches the live table.

## Acceptance criteria

- A table with `emphasis_rows: [Total]` renders the **Total** stub label bold + highlighted,
  matching its value cells, in both the live HTML table and the exported PNG.
- `emphasis_column` behavior is unchanged (per-cell only; stub not forced).
- Existing table golden/snapshot tests updated to reflect the newly-emphasized stub.

## Downstream cleanup

The dashboard currently works around this with a CSS rule in `tools/state-of-tariffs/styles.css`
(`tr:has(td.is-emphasis) th.tbl-table-stub { … }`). It covers only the live HTML table, not PNG
export. Once this lands and is re-vendored, that override can be removed.
