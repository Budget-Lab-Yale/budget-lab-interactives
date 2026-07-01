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
  x_axis_ticks: both
  columns:
    x: category
    series: substitution
    facet: scenario
    section: top_level
  series_order:
  - Pre-Substitution
  - Post-Substitution
  section_order:
  - Durable goods
  - Nondurable goods
  - Services
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

Tariffs affect different goods and services differently. Figure 7 shows the estimated price impact by spending category. Assuming Section 122 tariffs expire as scheduled, the categories most affected are goods products like motor vehicles, clothing, and furnishings. Services, which account for the majority of consumer spending, face only indirect price pressures through tariffs and thus see much smaller price effects. If Section 122 tariffs are extended, the price effects are directionally similar but larger, and clothing would rank above motor vehicles as the hardest-hit category.

