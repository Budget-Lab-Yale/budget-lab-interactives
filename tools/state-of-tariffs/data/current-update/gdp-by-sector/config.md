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
    pane_widths: equal-bar
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

Tariffs shrink the overall size of the US economy in the long run, but beneath aggregate GDP, they also drive reallocation across US sectors. Long-run output in the manufacturing sector expands slightly, with durable manufacturing seeing the largest gains within the manufacturing category. But this expansion in manufacturing more than crowds out the rest of the economy: construction, mining & extraction, and agriculture contract slightly. These patterns are similar regardless of whether Section 122 tariffs expire or are extended.
