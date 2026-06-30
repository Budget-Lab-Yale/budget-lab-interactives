---
short_label: Distributional Effects by Decile
figureType: chart
spec:
  chartType: bar
  data: data.csv
  title: Distributional Effects of Trump Administration Tariffs
  subtitle: By household income decile.
  source: GTAP v7, Census, BLS, BEA, The Budget Lab analysis.
  xAxisType: categorical
  orientation: vertical
  columns:
    x: decile
    series: scenario
    facet: measure
    value: value
  series_order:
  - Section 122 Expires
  - Section 122 Extended
  small_multiples:
    mode: per-pane
    columns: 2
    pane_order:
    - "% of ATI"
    - "2025$"
    pane_titles:
      "% of ATI": Share of after-tax income (%)
      "2025$": Dollars per household (2025$)
---

The estimated effect of all 2025 tariffs on households by income decile, shown both as a share of after-tax income and in 2025 dollars, under two assumptions about whether the Section 122 tariffs expire or are extended.
