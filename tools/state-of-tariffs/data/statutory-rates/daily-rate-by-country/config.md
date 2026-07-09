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
  # Pin each partner's color so the "Without China" toggle (which drops China from series_order)
  # doesn't shift every remaining country to the next palette slot. Values match the engine's
  # default categorical palette in the With-China order.
  series_colors:
    China: "#0072B2"
    Canada: "#E69F00"
    Mexico: "#8856BF"
    EU: "#2A8B3A"
    Japan: "#B8302C"
    UK: "#CC79A7"
    Free-trade partners: "#7A5230"
    Rest of World: "#58A3E7"
---

The daily statutory rate by trading-partner group for the selected policy scenario.
