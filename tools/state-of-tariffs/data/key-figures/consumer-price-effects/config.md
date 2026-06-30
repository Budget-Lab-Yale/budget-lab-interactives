---
short_label: Consumer Price Effects by Category
figureType: chart
spec:
  chartType: bar
  data: data.csv
  title: Consumer Price Effects by PCE Spending Category
  subtitle: Percent change in consumer prices.
  note: "I-O price model (Barbiero & Stein 2025). Pre-substitution = welfare-relevant tariff price effect. Post-substitution = after partial-equilibrium trade substitution."
  source: BEA, GTAP v7, The Budget Lab analysis.
  orientation: horizontal
  xAxisType: categorical
  columns:
    x: category
    series: substitution
    facet: scenario
    value: value
  series_order:
  - Pre-Substitution
  - Post-Substitution
  small_multiples:
    mode: shared
    columns: 2
    pane_order:
    - Section 122 Expires
    - Section 122 Extended
  x_order:
  - Motor vehicles and parts
  - Clothing and footwear
  - Furnishings and durable household equipment
  - Recreational goods and vehicles
  - Other durable goods
  - Other nondurable goods
  - Net foreign travel
  - Transportation services
  - Communication
  - Food and beverages purchased for off-premises consumption
  - Household utilities
  - Gasoline and other energy goods
  - Other services
  - Final consumption expenditures of NPISH
  - Recreation services
  - Food services and accommodations
  - Health care
  - Education
  - Financial services and insurance
  - Housing
---

The estimated percent change in consumer prices by PCE spending category, faceted by whether the Section 122 tariffs expire or are extended, showing the price effect before and after partial-equilibrium trade substitution.

<!-- HELD: not listed in tracker.yaml. This figure needs faceted *horizontal* bar charts,
     which the chart engine does not yet support (horizontal + small_multiples). Re-add
     `consumer-price-effects` to the households-prices section in tracker.yaml once the
     engine supports it. Data (data.csv) and this spec are ready. -->

