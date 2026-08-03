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
  vintageDate: "2025-11-17"
  scenarioTab: "baseline"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports.

_Notes: Published in the original release as Figure 1. Baseline scenario only -- the IEEPA Invalidation scenario has no equivalent historical chart in the source. This figure has no direct counterpart in the reference (2025-10-30) vintage structure otherwise; it is included here as an additional figure. Unlike the immediately preceding vintages, this release's "Current" reference-line columns are already internally consistent (no stale 1790-2024 values), so no correction was needed._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis._
