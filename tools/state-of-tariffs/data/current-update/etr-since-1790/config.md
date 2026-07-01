---
short_label: Effective Tariff Rate Since 1790
figureType: chart
spec:
  chartType: line
  data: data.csv
  title: U.S. Average Effective Tariff Rate Since 1790
  subtitle: Customs duty revenue as a percentage of goods imports.
  source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis.
  xAxisType: numeric
  xAxisPolicy:
    anchorAtZero: false
  yAxisPolicy:
    min: 0
    tickCount: 6
  series_order:
  - Effective Tariff Rate
  - Projected Post-Substitution Rate
  - Projected Pre-Substitution Rate
  series_colors:
    Projected Post-Substitution Rate: blue
    Projected Pre-Substitution Rate: amber
  series_styles:
    Projected Post-Substitution Rate: { dashed: true }
    Projected Pre-Substitution Rate: { dashed: true }
  annotations:
    yAxis:
    - y: 9.658
      label: Current pre-substitution rate
      style: dashed
      color: amber
      labelSide: top       # above the line (v1.2: y-mark side = top|middle|bottom)
      labelPosition: left  # at the left end of the line
      labelDx: 16
    - y: 8.212
      label: Current post-substitution rate
      style: dashed
      color: blue
      labelSide: bottom    # below the line
      labelPosition: left
      labelDx: 16
---

The distinction between pre-substitution metrics (before consumers and businesses shift purchases in response to the tariffs) and post-substitution (after they shift) is a crucial one. One metric where the difference is meaningful is the average effective tariff rate.

Measured pre-substitution—assuming there are no shifts in the import shares of different countries and products—the tariff policy in effect as of April 6 brings the US average effective tariff rate to approximately 11.8%, the highest since the early 1940s (excluding last year's tariff rates). A pre-substitution approach is a good measure of welfare, since it reflects the full cost faced by consumers and firms before they start making difficult spending choices. After the Section 122 tariffs expire in July and the Section 232 pharmaceutical tariffs take effect in September, the rate will settle at 9.7%. If the Section 122 tariffs are instead made permanent, the end-of-2026 rate would be 12.2%.

Post-substitution—after imports shift in response to the tariffs—the end-of-2026 effective tariff rate will be 8.2% assuming Section 122 expires, or 10.5% if extended.

Figure 1 shows the Trump administration’s tariffs in the long-run historical context, and Figure 2 plots the daily pre-substitution ETR throughout 2025 and 2026. Table 2 shows a country-level breakdown for pre- and post-substitution rates for the end of 2026.
