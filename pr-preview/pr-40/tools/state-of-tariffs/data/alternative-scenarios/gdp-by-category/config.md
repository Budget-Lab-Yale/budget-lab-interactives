---
short_label: Long-Run GDP Breakdown
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
      - {id: country, label: Trading Partner}
  subtitle: Percent change in the level of real GDP versus baseline, by scenario.
  value_suffix: "%"
  source: GTAP v7 [Corong et al. (2017)], The Budget Lab analysis.
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

The long-run change in real GDP by sector or trading partner, compared across scenarios. In the sector
view, manufacturing sub-sectors appear in a separate "Manufacturing detail" pane. The total is the
left-most bar.
