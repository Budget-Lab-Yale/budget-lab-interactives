---
short_label: By Trading Partner
figureType: chart
events: [major, projection]
scenario_role: selector
spec:
  chartType: line
  data: data.csv
  title: Statutory Tariff Rate by Trading Partner — {scenario}
  subtitle: Import-weighted statutory rate on imports from each partner. Percent.
  source: The Budget Lab analysis.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 140
    tickCount: 6
  series_order:
  - China
  - Canada
  - Mexico
  - EU
  - Japan
  - UK
  - Free-trade partners
  - Rest of World
---

The daily statutory rate by trading-partner group for the selected policy scenario.
