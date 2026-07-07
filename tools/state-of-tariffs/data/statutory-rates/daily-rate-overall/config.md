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
  - additional
  series_labels:
    total: Total effective rate
    additional: Additional tariffs (above baseline)
---

The overall statutory tariff rate over time for the selected policy scenario. Dashed vertical
lines mark major tariff-policy changes; the grey band marks the projected period.

_Policy-change markers and the projection band are defined in
`data/statutory-rates/events.yaml` (placeholder values, to be updated by the modelers)._
