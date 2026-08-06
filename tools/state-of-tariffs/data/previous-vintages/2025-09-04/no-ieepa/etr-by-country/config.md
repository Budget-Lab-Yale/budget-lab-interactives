---
figureType: composite (table + stacked bar chart)
spec:
  title: "Average Effective Tariff Rate by Trading Partner"
  subtitle: "as of September 3, 2025, pre- and post-substitution. Percent."
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
  vintageDate: "2025-09-04"
  scenarioTab: "no-ieepa"
---

**Average Effective Tariff Rate by Trading Partner**

as of September 3, 2025, pre- and post-substitution. Percent. Shown under the No-IEEPA scenario, which models the counterfactual removal of IEEPA-based tariffs.

_Notes: Published in the original release as Table 2/Figure 1 (Table 5/Figure 9 under the No-IEEPA scenario). China, Canada, Mexico, and Rest of World each contribute additively to the total average effective tariff rate, so the chart renders as a stacked bar per substitution basis, with the stack total shown above each bar. The source workbook's China row label was corrupted to read \"All Non-IEEPA 2025 Tariffs to Date\" (a copy-paste artifact from Table 4's scenario-name cell bleeding into this row); corrected to \"China\" here, matching the numeric values and row order (China, Canada, Mexico, Rest of World, Total). The table gives Average Effective Tariff Rate and Share of Goods Imports as two parallel metrics per country; the chart continues to use each country's additive contribution to the total (not shown in the table) for the stacked bars._

_Source: Census Bureau, GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
