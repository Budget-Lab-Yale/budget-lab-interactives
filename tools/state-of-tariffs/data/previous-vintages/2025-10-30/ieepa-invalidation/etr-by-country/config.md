---
figureType: composite (table + stacked bar chart)
spec:
  title: "Average Effective Tariff Rate by Trading Partner"
  subtitle: "As of October 30, 2025, pre- and post-substitution. Percent. By scenario."
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
  vintageDate: "2025-10-30"
  scenarioTab: "ieepa-invalidation"
---

**Average Effective Tariff Rate by Trading Partner**

As of October 30, 2025, pre- and post-substitution. Percent. By scenario.

_Notes: Published in the original release as Appendix Table 2/Figure 1, "...IEEPA Invalidation Scenario." The existing table (unchanged, cross-tabbed by scenario × measure -- Baseline and IEEPA Invalidation side by side, matching the source's own comparative design) is paired with a new stacked bar chart. The chart shows the IEEPA Invalidation scenario in isolation only -- via its own dedicated `chart-data.csv` containing just that scenario's country-level rows -- rather than faceting both scenarios together, so the chart matches what this tab is meant to show on its own. China, Canada, Mexico, and Rest of World stack to the IEEPA Invalidation total for each substitution basis._

_Notes (table): Table shows two metrics per country -- Average Effective Tariff Rate (each country's own rate; the source workbook gives a single blended value, used for both pre- and post-substitution) and Share of Goods Imports (pre-/post-substitution) -- both present in the original release's Table 2/Figure 1. Sourced from `data-full.csv`, used only by the table part; the chart part is unchanged and continues to read `data.csv` (each country's additive contribution to the total, not exposed as a table metric), so the stacked bar still reflects each country's contribution to the total, as originally designed._

_Source: Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
