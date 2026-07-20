# Engine request: collapsible table row groups (+ order-independent grouping)

**Repo:** `budget-lab-chart-engine`
**Type:** feature (table) + related grouping fix
**Requested by:** State of Tariffs dashboard (alt scenarios "Effective Rate by Country" table)

## Motivation

Tables with a row-group stub (e.g. `stub: [country, scenario]`) can get long. We want the group
headers to be **collapsible** — click a group to expand/collapse its rows — with an
**expand/collapse-all** control and an author-set **default** open/closed state. We've built this
tool-side (render.js post-processes the mounted table + a MutationObserver reapplies after the
engine's resize re-render), but it belongs in the engine so it's robust and available to all
tools, and so PNG export / a11y are handled coherently.

## Desired behavior

1. **Collapsible groups.** For a table with ≥1 stub group level, render a caret on each group
   header (inline, to the **left** of the group label) and toggle that group's rows on click.
   Nested groups collapse their subtree.
2. **Expand/collapse all** control in the table chrome.
3. **Default state**, author-configurable, e.g.:
   ```yaml
   collapsible:
     default: collapsed        # collapsed | expanded
     expanded: [China, Total]  # groups open despite the default
     collapsed: [ ... ]        # (or closed despite an expanded default)
   ```
4. **State survives re-render.** The table re-renders on width change (ResizeObserver replaces the
   DOM); collapse state must persist. (Our tool-side version reapplies via a MutationObserver — a
   native implementation should just keep state.)
5. **A11y:** the caret/header is a real toggle button with `aria-expanded`; rows are
   hidden accessibly. Keyboard operable.

## Related fix: group by stub value regardless of row order

While building this we hit a grouping bug worth fixing alongside: the table renderer emits a group
header only on a group's **first appearance** and assumes each group's rows are **contiguous** in
the input (`src/table/model.ts` — stub-paths collected first-seen; group header emitted once per
`gKey`). Tidy model data is frequently ordered by another key (ours is **scenario-major**), so a
group's later rows detach and render, headerless, under the last group. Also, `row_order` sorts
stub-paths by the **leaf** value globally, which worsens multi-level grouping.

**Ask:** group rows by their stub path independent of input order — collect each group's rows
wherever they appear and render them under that group's single header (and scope `row_order`
within groups, not globally). Today the dashboard works around this by stable-reordering rows to
be group-contiguous before `mountTable`.

## Acceptance criteria

- A table with `collapsible` renders per-group carets (left of the label), click-toggle,
  expand/collapse-all, and honors the default/expanded/collapsed config; state persists across
  resize re-renders; toggles are keyboard/aria accessible.
- A grouped table renders correctly regardless of input row order (non-contiguous group rows are
  gathered under one header); `row_order` orders within groups.

## Interim / dashboard context

Implemented tool-side in `tools/state-of-tariffs/render.js` (`setupCollapsible`,
`groupContiguousRows`) + `styles.css`. Once the engine supports this, that code and the
pre-sort can be removed.
