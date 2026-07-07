---
short_label: Real GDP
figureType: chart
scenario_role: series
spec:
  chartType: line
  data: data.csv
  title: U.S. Real GDP Effect by Scenario
  subtitle: Percentage-point change in the level of real GDP versus baseline.
  source: Bureau of Economic Analysis, The Budget Lab analysis.
  xAxisType: temporal
  yAxisPolicy:
    includeZero: true
    tickCount: 6
  columns:
    x: time
    series: scenario
    value: value
---

The projected path of real GDP relative to baseline, compared across scenarios. Use the
**View** toggle for levels vs change-vs-default.
