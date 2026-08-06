---
figureType: composite (table + stacked bar chart)
spec:
  title: "Average Effective Tariff Rate by Trading Partner"
  subtitle: "As of July 13, 2025, pre- and post-substitution. Percent."
  source: "Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis."
  data: "data-full.csv"
  header:
    - "metric"
    - "substitution"
  column_group_order:
    - "rate"
    - "import_share"
  header_labels:
    presub: "Pre-substitution"
    postsub: "Post-substitution"
    rate: "Average Effective Tariff Rate"
    import_share: "Share of Goods Imports"
  originalFigureId: "etr-by-country"
  vintageDate: "2025-07-13"
  scenarioTab: "default-scenario"
---

**Average Effective Tariff Rate by Trading Partner**

As of July 13, 2025, pre- and post-substitution. Percent.

_Notes: Published in the original release as Table 2/Figure 1, "Average Effective US Tariff Rate, New 2025 Policy Through July 13" (source workbook's title page is dated July 14, but the vintage date follows the established July 13 convention already used in this repo folder). Unlike the immediately preceding July 11 vintage, this release's Total row in the source is correctly recalculated and matches the sum of the four country rows exactly, so no correction was needed here. China, Canada, Mexico, and Rest of World each contribute additively to the total average effective tariff rate, so the chart renders as a stacked bar per substitution basis (pre-/post-substitution), with the stack total shown above each bar. The table gives the same figures broken out by row._

_Notes (table): Table shows two metrics per country -- Average Effective Tariff Rate (each country's own rate; the source workbook gives a single blended value, used for both pre- and post-substitution) and Share of Goods Imports (pre-/post-substitution) -- both present in the original release's Table 2/Figure 1. Sourced from `data-full.csv`, used only by the table part; the chart part is unchanged and continues to read `data.csv` (each country's additive contribution to the total, not exposed as a table metric), so the stacked bar still reflects each country's contribution to the total, as originally designed._

_Source: Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
