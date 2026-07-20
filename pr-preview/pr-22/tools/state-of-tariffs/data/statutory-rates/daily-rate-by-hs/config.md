---
short_label: By Product
figureType: chart
events: [major, projection]
scenario_role: selector
spec:
  chartType: line
  data: data.csv
  title: Statutory Tariff Rate for Selected Products — {scenario}
  subtitle: Import-weighted statutory rate by product group. Percent.
  note: "Product groups are based on underlying HTS product codes. Most groups follow HS chapters; semiconductors are HTS headings 8541–8542 and are excluded from the broader electronics category. Chapter 99 tariff provisions are assigned to the underlying product group."
  source: The Budget Lab analysis.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 80
    tickCount: 6
  series_order:
  - Motor vehicles & parts
  - Iron & steel
  - Aluminum
  - Semiconductors & electronic components
  - Pharmaceuticals
  - Electronics & electrical equipment
  - "Textiles, apparel & footwear"
---

The daily statutory rate for selected product groups, for the selected scenario.
