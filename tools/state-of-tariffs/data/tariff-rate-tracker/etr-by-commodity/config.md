---
short_label: ETR by Commodity
figureType: chart
events: [major, projection]
spec:
  chartType: line
  data: data.csv
  title: Daily Effective Tariff Rate for Selected Commodities
  subtitle: Daily import-weighted ETR by GTAP sector. Percent.
  note: Sectors defined by GTAP classification.
  source: Yale Budget Lab Tariff Rate Tracker.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    tickCount: 5
  series_order:
  - Steel
  - Non-Ferrous Metals (incl. Aluminum)
  - Motor Vehicles
  - Electronics
  - Textiles
  - Processed Food
---

