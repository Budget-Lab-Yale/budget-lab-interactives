---
figureType: chart
spec:
  chartType: line
  data: "data.csv"
  title: "US Average Effective Tariff Rate Since 1790"
  subtitle: "Customs duty revenue as a percentage of goods imports."
  source: "Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis."
  xAxisType: temporal
  columns:
    x: "year"
    series: "series"
    value: "value"
  series_labels:
    historical: "Historical"
    projected_presub: "Projected (pre-substitution)"
    projected_postsub: "Projected (post-substitution)"
    current_average_presub: "Current average effective rate (pre-substitution)"
    current_average_postsub: "Current average effective rate (post-substitution)"
  series_styles:
    current_average_presub:
      dashed: true
    current_average_postsub:
      dashed: true
  originalFigureId: "etr-historical"
  vintageDate: "2026-01-19"
  scenarioTab: "baseline"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports.

_Notes: Published in the original release as Figure 1; missing from this vintage entirely. Added. The source workbook's own Figure 1 sheet computes its "Current" reference lines using only the With Greenland Tariffs scenario's totals, regardless of which tab is viewed. To keep both scenario tabs isolated, this recomputes the current-average reference line for each scenario from its own Table 2 total, rather than reusing a single shared line._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis.
_
