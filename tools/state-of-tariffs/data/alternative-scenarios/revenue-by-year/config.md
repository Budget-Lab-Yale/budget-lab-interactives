---
short_label: Revenue by Year
figureType: chart
scenario_role: series
selectors:
- id: series
  label: Estimate
  kind: single
  default: conventional
  options:
  - {id: conventional, label: Conventional}
  - {id: dynamic, label: Dynamic}
total:
  column: category
  value: Total
  toggle: show_total
  show_option: "on"
spec:
  chartType: bar
  data: data.csv
  title: Estimated Federal Revenue Effect by Year
  subtitle: Billions of dollars, by scenario.
  source: GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    series: scenario
    value: value
---

Estimated federal revenue from the tariffs by fiscal year, compared across scenarios. Use the
sidebar to switch conventional vs dynamic, and the **View** toggle for levels vs
change-vs-default.
