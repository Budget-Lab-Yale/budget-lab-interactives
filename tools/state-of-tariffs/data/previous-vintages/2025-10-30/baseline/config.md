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
  vintageDate: "2025-10-30"
  scenarioTab: "baseline"
---

**US Average Effective Tariff Rate Since 1790**

Customs duty revenue as a percentage of goods imports.

_Notes: Published in the original release as Figure 2. Baseline scenario only -- the IEEPA Invalidation scenario has no equivalent historical chart in the source, since it is a hypothetical policy counterfactual rather than an observed rate. This figure has no direct counterpart in the reference (2025-10-30) vintage structure otherwise; it is included here as an additional figure. **Data correction:** the source workbook's "Current Post/Pre-Substitution Rate" columns are stale for 1790-2024 (and even inconsistent between years, e.g. a third distinct value at exactly 2024) but the Figure 3 endpoint and Table 2/Figure 1's own recalculated Total agree on 17.88%/17.36% (pre-/post-substitution) -- that consistent value is used throughout instead. Separately, the source notes that TBL's ETR calculation methodology changed on October 30, 2025, adding roughly 0.9pp to the ETR relative to the prior methodology; values before this vintage are not on the same basis._

_Source: Historical Statistics of the United States Ea424-434, Monthly Treasury Statement, Bureau of Economic Analysis, The Budget Lab analysis._
