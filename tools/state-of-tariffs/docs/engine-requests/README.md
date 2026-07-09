# Chart-engine change requests

Requests for the `budget-lab-chart-engine` repo, gathered while building the State of Tariffs
dashboard. Each file is a self-contained, implementation-ready spec (problem → desired behavior
→ suggested implementation → acceptance criteria). Hand off as a set.

| Spec | Summary | Priority |
|---|---|---|
| [emphasis-stub.md](emphasis-stub.md) | `emphasis_rows` should style the stub cell too (whole-row / total-row emphasis); HTML and SVG renderers currently disagree. | Medium |
| [projected-segments.md](projected-segments.md) | Style the projected portion of a series distinctly (dashed line / faded area) from a data flag, one legend entry. | Low |
| [section-header-top-margin.md](section-header-top-margin.md) | First section header clips at the top of a horizontal sectioned bar chart unless top ticks are enabled; top margin should reserve room for it. | Medium |
| [section-with-facet.md](section-with-facet.md) | `columns.section` + `columns.facet` together silently garbles the layout; should be supported or rejected with a clear error. | Medium |
| [per-facet-annotations.md](per-facet-annotations.md) | Annotations are global; faceted per-pane charts need pane-scoped annotation values (a Total reference line at a different value per pane), for both vertical (yAxis) and horizontal (xAxis) bars. | Medium |
| [annotation-value-in-label.md](annotation-value-in-label.md) | Support a `{value}` token (+ format) in annotation labels so a reference line can show its own value (e.g. "Overall (-0.07%)"); done in the tool's render layer today. | Low |
| [inline-title-selector.md](inline-title-selector.md) | Support an interactive single-select control inline in the figure title (AILMT-style), with a change callback — the vendored engine renders the title non-interactively today. | Low |
| [collapsible-row-groups.md](collapsible-row-groups.md) | Collapsible table row groups (caret, expand/collapse-all, default state) + fix grouping to be independent of input row order. Built tool-side today. | Medium |
| [header-leaf-collision.md](header-leaf-collision.md) | Multi-tier header leaves are keyed by the last value only, so repeated leaf values under different banner groups collide (columns dropped). Key by full path. Worked around tool-side. | Medium |
| [category-and-single-series-color.md](category-and-single-series-color.md) | No per-category bar color (e.g. a distinct Total bar) and single-series color needs the obscure `{"": color}` idiom. Add `category_colors` + a first-class single-series color. | Medium |
| [legend-visibility.md](legend-visibility.md) | No way to hide the legend on a multi-series chart when it's redundant. Add `legend: false`. | Low |
| [table-group-order.md](table-group-order.md) | Row groups order by first-seen only; add `group_order` (like row_order/column_order) to order stub groups without reordering data. | Low |

**Delivered in engine 1.3.0** — every request above shipped in 1.3.0; the tool's tool-side
workarounds were removed on re-vendor.

## Delivered in engine 1.3.1

Both opened while testing 1.3.0, spec'd, and shipped in 1.3.1 (re-vendored):

| Spec | Summary |
|---|---|
| [multi-tier-header-order.md](multi-tier-header-order.md) | 2-tier header super-groups stay contiguous under `column_order` (now a within-super sort); new `column_group_order` orders the super tier. |
| [collapse-all-control-placement.md](collapse-all-control-placement.md) | `collapsible.control` defaults to `"stub-header"` — the expand/collapse-all toggle now sits in the top-left corner cell above the stub. |

## Delivered in engine 1.3.1 (commit `36995da`, re-vendored)

| Spec | Summary | Status |
|---|---|---|
| [single-facet-hover-tooltip.md](single-facet-hover-tooltip.md) | A `small_multiples` chart with one facet value now hovers with the bar-end pill (fill-matched), not the legacy tooltip. | **Fully delivered.** Tool no longer needs a facet workaround for hover; it still drops a size-1 facet to standalone purely to suppress the redundant single-value pane title. |
| [inline-selector-accent-noseries-bars.md](inline-selector-accent-noseries-bars.md) | The inline title-selector color accent now recolors no-series bar charts (standalone). | **Fully delivered** (with the faceted follow-up below). |
| [faceted-inline-selector-accent.md](faceted-inline-selector-accent.md) | Extend the accent to FACETED (`small_multiples`) bars — `mountFigure` computes `accentColor` and threads it to each pane, re-rendering on selection change. | **Fully delivered** (commit `39ee9ac`). gdp-by-category's `bar_color` bridge removed; sector/country coloring is now entirely engine-driven (verified: a faceted pane recolors to a distinct accent). |

_No open requests — every spec gathered while building the dashboard has shipped._
