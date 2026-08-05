---
figureType: composite (table + stacked bar chart)
spec:
  title: "Average Effective Tariff Rate by Trading Partner"
  subtitle: "As of April 15, 2025, pre- and post-substitution. Percent."
  source: "Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis."
  data: "data-full.csv"
  header:
    - "metric"
    - "substitution"
  column_group_order:
    - "rate"
    - "import_share"
    - "contribution"
  header_labels:
    presub: "Pre-substitution"
    postsub: "Post-substitution"
    rate: "Average Effective Tariff Rate"
    import_share: "Share of Goods Imports"
    contribution: "Contribution"
  originalFigureId: "etr-by-country"
  vintageDate: "2025-04-15"
  scenarioTab: "default-scenario"
---

**Average Effective Tariff Rate by Trading Partner**

As of April 15, 2025, pre- and post-substitution. Percent.

_Notes: Published in the original release as Table 2/Figure 1, "Change in Average Effective US Tariff Rate, New 2025 Policy Through April 15." China, Canada, Mexico, and Rest of World each contribute additively to the total average effective tariff rate, so the chart renders as a stacked bar per substitution basis (pre-/post-substitution), with the stack total shown above each bar. The table gives the same figures broken out by row._

_Notes (table): Adds two metrics alongside Contribution -- Average Effective Tariff Rate (each country's own rate; the source workbook gives a single blended value, used for both pre- and post-substitution) and Share of Goods Imports (pre-/post-substitution) -- both present in the original release's Table 2/Figure 1 but missing from the initial restructuring of this vintage. Sourced from a new `data-full.csv` used only by the table part; the chart part is unchanged and continues to read the original `data.csv` (Contribution only), so the stacked bar still reflects just the additive contribution to the total, as originally designed._

_Source: Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
