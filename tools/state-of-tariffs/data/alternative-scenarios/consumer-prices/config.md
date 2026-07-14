---
short_label: Consumer Prices
figureType: chart
scenario_role: series
spec:
  chartType: bar
  data: data.csv
  title: Consumer Price Effects by Spending Category
  subtitle: Percent change in consumer prices, by scenario.
  source: GTAP v7 [Corong et al. (2017)], The Budget Lab analysis.
  orientation: horizontal
  xAxisType: categorical
  columns:
    x: category
    facet: substitution
    series: scenario
    value: value
  x_order:
  - Motor vehicles and parts
  - Furnishings and durable household equipment
  - Recreational goods and vehicles
  - Other durable goods
  - Other nondurable goods
  - Food and beverages purchased for off-premises consumption
  - Gasoline and other energy goods
  - Clothing and footwear
  - Net foreign travel
  - Transportation services
  - Communication
  - Household utilities
  - Recreation services
  - Other services
  - Final consumption expenditures of NPISH
  - Food services and accommodations
  - Health care
  - Education
  - Financial services and insurance
  - Housing
  small_multiples:
    mode: shared
    columns: 2
    pane_order:
    - presub
    - postsub
    pane_titles:
      presub: Pre-substitution
      postsub: Post-substitution
---

Consumer-price effects by PCE spending category, split into pre- and post-substitution panes,
compared across scenarios. Use the **View** toggle for levels or change vs. default.
