---
short_label: By Product
figureType: chart
events: [major, projection]
scenario_role: selector
spec:
  chartType: line
  data: data.csv
  title: Statutory Tariff Rate for Selected Products — {scenario}
  subtitle: Import-weighted statutory rate by GTAP sector. Percent.
  note: A representative subset of GTAP sectors is shown.
  source: The Budget Lab analysis.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 80
    tickCount: 6
  series_order:
  - Motor vehicles and parts
  - Ferrous metals
  - Electrical equipment
  - Wearing apparel
  - Textiles
  - Basic pharmaceutical products
  - Beverages and tobacco products
---

The daily statutory rate for a representative subset of products (GTAP sectors) for the
selected policy scenario. `series_order` selects which sectors render — swap in other GTAP
sector names to change the set.
