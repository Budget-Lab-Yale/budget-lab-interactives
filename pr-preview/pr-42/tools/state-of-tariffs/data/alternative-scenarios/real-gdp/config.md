---
short_label: GDP over Time
figureType: chart
scenario_role: series
spec:
  chartType: line
  data: data.csv
  title: Effect on Real GDP over Time
  subtitle: Percent change in the level of real GDP versus baseline.
  value_suffix: "%"
  source: GTAP v7 [Corong et al. (2017)], The Budget Lab analysis.
  xAxisType: temporal
  yAxisPolicy:
    includeZero: true
    tickCount: 6
  columns:
    x: time
    series: scenario
    value: value
---

The projected path of real GDP relative to baseline, compared across scenarios. Use the **View**
toggle for levels or change vs. default.
