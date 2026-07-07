---
short_label: Revenue by Year
figureType: chart
total:
  column: category
  value: Total
  toggle: show_total
  show_option: "on"
spec:
  chartType: bar
  data: data.csv
  title: Estimated Federal Revenue Effect by Year
  subtitle: Conventional and dynamic estimates. Billions of dollars.
  source: GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    series: series
    value: value
  series_order:
  - conventional
  - dynamic
  series_labels:
    conventional: Conventional
    dynamic: Dynamic
---

Estimated federal revenue from the tariffs by fiscal year, on both a conventional and a
dynamic basis. Use the sidebar toggle to add the 10-year total as an extra bar group.
