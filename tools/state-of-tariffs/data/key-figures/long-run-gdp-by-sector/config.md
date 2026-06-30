---
short_label: Long-Run GDP by Sector
figureType: chart
spec:
  chartType: bar
  data: data.csv
  title: Change in Long-Run Real U.S. GDP by Sector from Trump Administration Tariffs
  subtitle: Percentage points.
  note: Real value added by sector.
  source: GTAP v7, The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    series: series
    facet: pane
    value: value
  series_order:
  - Section 122 Expires
  - Section 122 Extended
  small_multiples:
    mode: shared
    columns: 2
    pane_order:
    - Sectors
    - Manufacturing detail
  x_order:
  - Agriculture
  - Mining & Extraction
  - Total Manufacturing
  - Utilities
  - Construction
  - Services
  - Overall Real GDP
  - Durable Manufacturing
  - Advanced Manufacturing
  - Nondurable Manufacturing
---

The estimated long-run change in real value added by sector, under two assumptions about whether the Section 122 tariffs expire or are extended.
