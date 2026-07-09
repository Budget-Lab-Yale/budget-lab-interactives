---
short_label: Real GDP by Category
figureType: chart
scenario_role: series
spec:
  chartType: bar
  data: data.csv
  title: Long-Run Change in Real GDP by {dimension}
  # Inline title selector (engine-rendered dropdown). No option colors: this chart is multi-series
  # (one series per scenario), so bar color stays scenario-driven; the selector only switches which
  # dimension's rows are shown.
  title_selectors:
    dimension:
      default: sector
      options:
      - {id: sector, label: Sector}
      - {id: country, label: Country}
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
  - Total
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
separates manufacturing sub-sectors into a "Manufacturing detail" pane. The overall total is the
left-most bar.
