---
figureType: chart
spec:
  chartType: bar
  data: "data.csv"
  title: "Comparison of 2027 Distributional Effects of 2025 Tariffs to Date"
  subtitle: "Through June 16. By household income decile."
  source: "GTAP v7 [Corong et al (2017)], Census, BLS, BEA, The Budget Lab analysis."
  orientation: vertical
  xAxisType: categorical
  columns:
    x: "category"
    facet: "basis"
    series: "method"
    value: "value"
  x_order: ["1","2","3","4","5","6","7","8","9","10"]
  x_axis_title: "Income decile"
  small_multiples:
    mode: per-pane
    columns: 2
    pane_order: ["% of after-tax income", "2024 dollars"]
  series_order: ["New Method", "Old Method"]
  series_colors:
    New Method: blue
    Old Method: amber
  originalFigureId: "distribution-2027-comparison"
  vintageDate: "2025-06-17"
  scenarioTab: "default-scenario"
---

**Comparison of 2027 Distributional Effects of 2025 Tariffs to Date**

Through June 16. By household income decile.

_Notes: Published in the original release as a standalone Appendix, not tied to one of the seven numbered figures; it has no counterpart anywhere in the previous-vintages structure and is included here as an additional figure. It compares the distributional-effects methodology used starting with this release ("New Method") against the methodology used in prior releases ("Old Method"), both projected out to 2027, by household income decile and in both bases (share of after-tax income and 2024 dollars). The "New Method" series matches this vintage's main `distribution` figure exactly. The "Old Method" series omits decile 1, matching how decile 1 was handled in prior vintages._

_Source: GTAP v7 [Corong et al (2017)], Census, BLS, BEA, The Budget Lab analysis._
