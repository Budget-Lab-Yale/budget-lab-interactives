---
short_label: Real GDP by Category
figureType: chart
selectors:
- id: dimension
  label: Break out by
  kind: single
  default: sector
  options:
  - {id: sector, label: Sector}
  - {id: country, label: Country}
total:
  column: category
  value: Total
  annotation:
    label: Overall ({value})
    value_format: {suffix: "%", decimals: 2}
    style: dashed
    color: gray
    labelSide: bottom
    labelPosition: right
spec:
  chartType: bar
  data: data.csv
  title: Long-Run Change in Real GDP by {dimension}
  subtitle: Percentage-point change in the level of real GDP versus baseline.
  source: GTAP v7 [Corong et al (2017)], The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    facet: group
    value: value
  series_colors:
    "": amber
  small_multiples:
    mode: shared
    columns: 2
    pane_widths: equal-bar
  x_order:
  - Agriculture
  - Mining & Extraction
  - Total Manufacturing
  - Utilities
  - Construction
  - Services
  - Durable Manufacturing
  - Nondurable Manufacturing
  - Advanced Manufacturing
---

Long-run change in real GDP, broken out by sector or by country. The sector view separates
manufacturing sub-sectors into a "Manufacturing detail" pane; the country view separates
individual countries from country groups. The dashed line marks the overall change in real GDP.
