---
short_label: Real GDP by Category
figureType: chart
scenario_role: series
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
  hide: true   # overall/total hidden for now — presentation TBD (dropped the per-scenario lines)
spec:
  chartType: bar
  data: data.csv
  title: Long-Run Change in Real GDP by {dimension}
  subtitle: Percentage-point change in the level of real GDP versus baseline, by scenario.
  source: GTAP v7 [Corong et al (2017)], The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    facet: group
    series: scenario
    value: value
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

Long-run change in real GDP by sector or country, compared across scenarios. The sector view
separates manufacturing sub-sectors into a "Manufacturing detail" pane; the country view
separates individual countries from country groups.
