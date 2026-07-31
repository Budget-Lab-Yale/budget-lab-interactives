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
  vintageDate: "2025-07-22"
  scenarioTab: "default-scenario"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports.

_Notes: Published in the original release as Figure 1 (renumbered from Figure 2 in prior vintages, since this release added a new Figure 3 -- see the separate `etr-since-2025` figure). This figure has no direct counterpart in the reference (2025-10-30) vintage structure; it is included here as an additional figure. As with the prior vintages, this vintage distinguishes pre- and post-substitution average effective tariff rates, so both are shown here as separate reference lines._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis._
