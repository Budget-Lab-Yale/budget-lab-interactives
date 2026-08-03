---
figureType: composite (table + stacked bar chart)
spec:
  title: "Average Effective Tariff Rate by Trading Partner"
  subtitle: "As of November 17, 2025, pre- and post-substitution. Percent."
  source: "GTAP v7 [Corong et al (2017)], The Budget Lab analysis."
  originalFigureId: "etr-by-country"
  vintageDate: "2025-11-17"
  scenarioTab: "baseline"
---

**Average Effective Tariff Rate by Trading Partner**

As of November 17, 2025, pre- and post-substitution. Percent.

_Notes: Published in the original release as Table 2, which this vintage restructured into three parallel metrics per country: **Average Effective Tariff Rate** (each country's own average tariff rate on its exports to the US -- not additive across countries), **Share of Goods Imports** (each country's share of total US imports), and **Contribution** (each country's additive contribution to the overall average effective tariff rate; these sum to the Total). The initial restructuring of this figure only captured the Rate metric and mislabeled it as the additive contribution -- China's presub value was stored as 24.0 (its own tariff rate) rather than 3.2 (its contribution), so the four countries summed to ~59% instead of the 14.4% Total. This version adds all three metrics to `data.csv` (a `metric` column distinguishes them) and uses a separate `chart-data.csv` containing only the Contribution values for the stacked bar chart, since Contribution is the metric that's actually additive. China, Canada, Mexico, and Rest of World stack to the Total for each substitution basis in the chart._

_Source: GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
