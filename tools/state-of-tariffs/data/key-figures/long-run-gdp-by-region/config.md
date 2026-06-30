---
short_label: Long-Run GDP by Region
figureType: chart
spec:
  chartType: bar
  data: data.csv
  title: Long-Run Change in Real GDP Level from Trump Administration Tariffs
  subtitle: Percentage point change.
  note: "FTROW = countries with a comprehensive free trade agreement with the US. ROW = all other countries."
  source: GTAP v7 [Corong et al (2017)], The Budget Lab analysis.
  orientation: vertical
  valueLabels:
    show: false
  xAxisType: categorical
  columns:
    x: category
    series: series
    value: value
  series_order:
  - Section 122 Expires
  - Section 122 Extended
  x_order:
  - USA
  - China
  - ROW
  - Canada
  - Mexico
  - FTROW
  - Japan
  - EU
  - UK
  - World Total
  - World ex USA
---

The estimated long-run change in the level of real GDP by country and region, under two assumptions about whether the Section 122 tariffs expire or are extended.
