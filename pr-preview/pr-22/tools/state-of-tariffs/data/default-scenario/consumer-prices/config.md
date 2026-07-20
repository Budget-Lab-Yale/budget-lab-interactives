---
short_label: Consumer Prices
figureType: chart
spec:
  chartType: bar
  data: data.csv
  title: Consumer Price Effects by Spending Category
  subtitle: Percent change in consumer prices, pre- and post-substitution.
  source: GTAP v7 [Corong et al. (2017)], The Budget Lab analysis.
  orientation: horizontal
  xAxisType: categorical
  yAxisPolicy:
    max: 3
  columns:
    x: category
    facet: substitution
    series: substitution
    value: value
  series_colors:
    presub: blue
    postsub: amber
  x_order:
  - Total
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

The consumer-price effect by PCE spending category, grouped as durable goods, nondurable goods,
and services, with the total at the top.

_TODO (TK): the "Total" row is placeholder data added on the dashboard side (the summary overall
price effect) — pending an aggregate PCE row from the modelers. It lives directly in `data.csv`
and will be overwritten on the next model sync._
