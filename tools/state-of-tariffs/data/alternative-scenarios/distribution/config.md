---
short_label: Household Costs by Income
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
# All-household total as a per-pane dashed reference line (one per basis pane). Data-driven Total
# rows; the engine scopes each line to its facet.
total:
  column: category
  value: Total
  annotation:
    label: All households ({value})
    value_format: {decimals: 2}
    style: dashed
    labelSide: bottom
    # Flip the Current law total label above its line (default is below). Per-vintage visual tweak —
    # re-check (scenario names/values change each release).
    series_overrides:
      Current law: {labelSide: top}
spec:
  chartType: bar
  data: data.csv
  title: Household Cost of Tariffs by Income Decile
  subtitle: Tariff burden by household income decile, by scenario.
  source: GTAP v7 [Corong et al. (2017)], The Budget Lab analysis.
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

The tariff burden by household income decile, as a share of after-tax income and in 2025 dollars,
compared across scenarios. Use the sidebar to switch between pre- and post-substitution, and the
**View** toggle for levels or change vs. default.
