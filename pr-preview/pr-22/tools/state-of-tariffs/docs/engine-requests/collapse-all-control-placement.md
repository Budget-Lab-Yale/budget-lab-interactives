# Engine request: place the expand/collapse-all control above the stub, not in the download row

**Repo:** `budget-lab-chart-engine`
**Type:** change (tables — collapsible row groups)
**Requested by:** State of Tariffs dashboard (etr-by-country, alternative scenarios)
**Follows:** the 1.3.0 collapsible-row-groups feature

## Problem

The "Collapse all" / "Expand all" toggle for a collapsible table currently renders in the figure's
**footer action row, next to the Data / Image download buttons** (`src/table/mount.ts` inserts it
into the download `actions` via `actions.insertBefore(allBtn.el, actions.firstChild)`, styled with
`.figure-download-btn`). That reads as a *download/export* action and sits far from the row groups
it controls, at the bottom of the table.

The conventional place for a bulk expand/collapse control — and where readers look for it — is the
table's **top-left corner cell** (the empty `th.tbl-table-stub-header` above the row-label / stub
column), directly above the group carets it toggles.

## Desired behavior

- Render the expand/collapse-all toggle inside the table's top-left **stub-header corner cell**
  (`thead th.tbl-table-stub-header`), left-aligned, above the stub column — adjacent to the
  per-group carets it controls. It keeps its current label-flip behavior (Collapse all ⇄ Expand
  all) and whole-figure scope.
- Leave the **Data / Image** download buttons in the footer action row (only the collapse-all
  control moves out of it).
- Multi-tier header: the stub-header corner cell spans the header rows (rowspan); the control
  should sit at the **bottom** of that cell (aligned with the leaf header row / the first group
  header just below), not floating at the top.
- PNG export: the control is interactive chrome and should be **omitted from the exported image**
  (the export already renders a static snapshot at the live collapse state); it should not print a
  dead button in the corner.

Optionally make this configurable — `collapsible.control: "stub-header" | "footer"` (default
`"stub-header"`) — if the footer placement is worth keeping for tables where the corner cell is
tight. Default should be the stub-header corner.

## Reference

The dashboard implemented exactly this tool-side before 1.3.0 (now removed): a small toolbar in
`th.tbl-table-stub-header`, the corner cell given `vertical-align: bottom`, the button using the
figure's small-button chrome. It read well and never collided with the header tiers.

## Acceptance criteria

- A collapsible table renders the expand/collapse-all toggle in the top-left corner cell above the
  stub, not in the download row; Data/Image remain in the footer.
- With a multi-tier header, the control aligns to the bottom of the corner cell and does not
  overlap the header tiers.
- PNG export contains no expand/collapse-all button.
