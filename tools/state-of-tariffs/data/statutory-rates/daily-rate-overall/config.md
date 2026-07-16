---
short_label: Overall
figureType: chart
events: [major, projection]
scenario_role: selector
spec:
  chartType: line
  data: data.csv
  title: Daily Statutory Tariff Rate — {scenario}
  subtitle: Import-weighted average statutory tariff rate. Percent.
  source: The Budget Lab analysis.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 30
    tickCount: 6
  series_order:
  - total
  - new_tariffs
  series_labels:
    total: Total effective rate
    new_tariffs: Additional tariffs (above baseline)
---

The overall statutory tariff rate over time, for the selected scenario. Dashed vertical lines
mark major tariff policy changes. The grey band marks the projected period.
