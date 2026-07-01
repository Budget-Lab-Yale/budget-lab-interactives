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

One way to measure the distributional burden of tariffs is to look at the relationship between consumption, which gets more expensive under tariffs, and income for a given year. Under this view, tariffs are a regressive tax because lower-income households spend a larger fraction of their income than higher-income households do on average.

TBL finds that the burden, expressed as a share of post-tax-and-transfer income, on the first decile is about three times that of the top decile (1.1% versus 0.4% if Section 122 tariffs expire, and 1.9% versus 0.6% if extended). The average annual costs to households in the bottom and top deciles are about $517 and $2,175 respectively in 2025 dollars—figures that assume Section 122 tariffs expire. If instead Section 122 is made permanent, these annual household burdens would be about $813 and $3,424.
