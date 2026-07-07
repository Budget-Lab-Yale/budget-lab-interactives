---
short_label: Distribution by Decile
figureType: chart
scenario_role: series
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
  subtitle: Tariff burden by household income decile, by scenario.
  source: GTAP v7, Census, BLS, BEA, The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    facet: basis
    series: scenario
    value: value
  x_order: ["1","2","3","4","5","6","7","8","9","10"]
  x_axis_title: Income decile
  small_multiples:
    mode: per-pane
    columns: 2
    pane_order:
    - "% of after-tax income"
    - "2025 dollars"
---

The tariff burden by household income decile — as a share of after-tax income and in 2025
dollars — compared across scenarios. Use the sidebar to switch pre- vs post-substitution and the
**View** toggle for levels vs change-vs-default.
