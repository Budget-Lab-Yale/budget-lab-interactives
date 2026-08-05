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
  vintageDate: "2025-09-04"
  scenarioTab: "no-ieepa"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports. Shown under the No-IEEPA scenario, which models the counterfactual removal of IEEPA-based tariffs.

_Notes: Published in the original release as Figure 2 (Figure 10 under No-IEEPA). The source workbook's 1791 row label was corrupted to \"All Non-IEEPA 2025 Tariffs to Date\"; corrected to 1791 here, matching its position immediately after 1790 and its historical rate value (10), consistent with every other vintage's 1791 entry. Distinguishes pre- and post-substitution average effective tariff rates as separate reference lines._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis._
