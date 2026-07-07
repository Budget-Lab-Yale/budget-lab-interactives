---
short_label: Distribution by Decile
figureType: chart
selectors:
- id: substitution
  label: Substitution
  kind: single
  default: postsub
  options:
  - {id: presub, label: Pre-substitution}
  - {id: postsub, label: Post-substitution}
spec:
  chartType: bar
  data: data.csv
  title: Distributional Effect by Income Decile
  subtitle: Tariff burden by household income decile.
  source: GTAP v7, Census, BLS, BEA, The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    facet: basis
    series: basis
    value: value
  series_colors:
    "% of after-tax income": blue
    "2025 dollars": amber
  x_order: ["1","2","3","4","5","6","7","8","9","10"]
  x_axis_title: Income decile
  small_multiples:
    mode: per-pane
    columns: 2
    pane_order:
    - "% of after-tax income"
    - "2025 dollars"
---

The tariff burden by household income decile, shown as a share of after-tax-and-transfer income
and in 2025 dollars per household. Values are negative by convention (a burden). Use the sidebar
to switch pre- vs post-substitution.

_TODO (TK): the all-household total will be added as a per-pane reference-line annotation once
the engine supports per-facet annotations (see docs/engine-requests/per-facet-annotations.md) and
the modelers supply the aggregate._
