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
  vintageDate: "2025-10-17"
  scenarioTab: "default-scenario"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports.

_Notes: Published in the original release as Figure 2. This figure has no direct counterpart in the reference (2025-10-30) vintage structure; it is included here as an additional figure. **Data correction:** the source workbook's own "Current Post/Pre-Substitution Rate" columns are stale for years 1790-2024 (16.668%/17.856%) -- carried over from an earlier report -- but correct at the 2025 endpoint row (16.989%/17.975%), which matches the recalculated Total in Table 2/Figure 1 (2.418 + 14.5706%/15.5575%). The stale 1790-2024 values were replaced with the correct, consistent figure throughout, so the "current average" reference lines render as flat rather than jumping at 2025._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis._
