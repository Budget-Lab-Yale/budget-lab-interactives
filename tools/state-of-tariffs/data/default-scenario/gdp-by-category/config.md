---
short_label: Long-Run GDP Breakdown
figureType: chart
spec:
  chartType: bar
  data: data.csv
  title: Long-Run Change in Real GDP by {dimension}
  # Inline title selector: {dimension} is an engine-rendered dropdown. Its option color tints the
  # trigger label and (single-series chart) recolors the bars — sector blue, country amber. The
  # render layer filters rows to the active dimension and re-renders on change.
  title_selectors:
    dimension:
      default: sector
      options:
      - {id: sector, label: Sector, color: blue}
      - {id: country, label: Trading Partner, color: amber}
  subtitle: Percent change in the level of real GDP versus baseline.
  source: GTAP v7 [Corong et al. (2017)], The Budget Lab analysis.
  orientation: vertical
  xAxisType: categorical
  columns:
    x: category
    facet: group
    value: value
  category_colors:
    Total: "#6b7280"
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

The long-run change in real GDP, by sector or by trading partner. In the sector view, manufacturing
sub-sectors appear in a separate "Manufacturing detail" pane. The total is the left-most bar.
