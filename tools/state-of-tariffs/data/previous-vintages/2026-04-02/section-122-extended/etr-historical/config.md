---
figureType: chart
spec:
  chartType: line
  data: "data.csv"
  title: "US Average Effective Tariff Rate Since 1790"
  subtitle: "Customs duty revenue as a percentage of goods imports"
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
  scenario: "Section 122 Extended"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports

_Scenario: Section 122 Extended_

_Notes: Published in the original release as Figure 1; missing from this vintage entirely. Added. The source's own Figure 1 sheet is computed only on a Section 122 Expires basis; the Extended tab's version recomputes the current-average reference line using this scenario's own Table 2 total instead, so each tab is internally consistent._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis._
