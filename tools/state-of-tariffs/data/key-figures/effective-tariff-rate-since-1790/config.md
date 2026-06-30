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
      labelSide: left
      labelDx: 16
      labelDy: -12
    - y: 8.212
      label: Current post-substitution rate
      style: dashed
      color: blue
      labelSide: left
      labelDx: 16
      labelDy: 12
---

The average effective tariff rate is customs duty revenue as a share of the value of goods imports. The historical series runs through 2024; the dashed lines project the post- and pre-substitution rates implied by 2025–2026 tariff policy. The two horizontal reference lines mark the current post- and pre-substitution rates.
