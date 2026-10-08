---
short_label: Household Costs by Income
figureType: chart
selectors:
- id: substitution
  label: Substitution
  kind: single
  default: postsub
  options:
  - {id: presub, label: Pre-substitution}
  - {id: postsub, label: Post-substitution}
# All-household total as a per-pane dashed reference line. The value is data-driven (a Total row
# per basis pane); the engine scopes each line to its facet and formats {value} via value_format.
total:
  column: category
  value: Total
  annotation:
    label: All households ({value})
    style: dashed
    color: "#6b7280"
    labelSide: bottom
spec:
  chartType: bar
  data: data.csv
  title: Household Cost of Tariffs by Income Decile
  subtitle: Tariff burden by household income decile.
  source: GTAP v7 [Corong et al. (2017)], The Budget Lab analysis.
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

The tariff burden by household income decile, as a share of after-tax-and-transfer income and in
2025 dollars per household. Values are negative by convention. Use the sidebar to switch between
pre- and post-substitution.
