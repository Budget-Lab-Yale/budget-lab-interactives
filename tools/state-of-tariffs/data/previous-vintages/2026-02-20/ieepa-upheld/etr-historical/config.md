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
  vintageDate: "2026-02-20"
  scenarioTab: "ieepa-upheld"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports.

_Notes: Published in the original release as Figure 1, shown once (not split by scenario) with only the "Current Policy" reference line. The "current" reference lines here are computed per scenario tab as this tab's own Table 2 Total (the increase from new tariffs) plus the pre-existing 2.418% baseline rate, consistent with the methodology used throughout this repo's other vintages for the same figure._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis._
