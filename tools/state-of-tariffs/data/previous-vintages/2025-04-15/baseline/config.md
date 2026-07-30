---
figureType: chart
spec:
  chartType: bar
  data: "data.csv"
  title: "Change in Average Effective US Tariff Rate, New 2025 Policy Through April 15"
  subtitle: "Contribution to the increase in the US average effective tariff rate from new 2025 tariffs, by trading partner. Pre- and post-substitution."
  source: "Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis."
  orientation: horizontal
  xAxisType: categorical
  columns:
    x: "category"
    facet: "substitution"
    series: "substitution"
    value: "value"
  x_order:
    - "China"
    - "Canada"
    - "Mexico"
    - "Rest of World"
    - "Total"
  series_labels:
    presub: "Pre-substitution"
    postsub: "Post-substitution"
  series_colors:
    presub: "blue"
    postsub: "amber"
  emphasis_categories:
    - "Total"
  originalFigureId: "etr-by-country-chart"
  vintageDate: "2025-04-15"
  scenarioTab: "default-scenario"
---

**Change in Average Effective US Tariff Rate, New 2025 Policy Through April 15**

Contribution to the increase in the US average effective tariff rate from new 2025 tariffs, by trading partner. Pre- and post-substitution.

_Notes: This is the chart version of Table 2/Figure 1 as published in the April 15, 2025 release (originally rendered as a bar chart alongside the summary table). It has no direct counterpart in the reference (2025-10-30) vintage structure, which presents this data only as a table (see the "Effective Rate by Trading Partner" figure); it is included here as an additional figure to preserve the original chart presentation. The underlying values are identical to the "Effective Rate by Trading Partner" table._

_Source: Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
