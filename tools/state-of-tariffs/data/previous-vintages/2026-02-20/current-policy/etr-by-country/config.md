---
figureType: table
spec:
  title: "Average Effective Tariff Rate by Region"
  subtitle: "Using tariff policy as of February 20, 2026, under the Current Policy scenario. Pre- and post-substitution. Percent."
  source: "GTAP v7 [Corong et al (2017)], The Budget Lab analysis."
  data: "data.csv"
  stub:
    - "category"
  header:
    - "metric"
    - "substitution"
  column_order:
    - "presub"
    - "postsub"
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
  format:
    default:
      type: number
      decimals: 1
      suffix: "%"
  emphasis_rows:
    - "Total"
  originalFigureId: "etr-by-country"
  vintageDate: "2026-02-20"
  scenarioTab: "current-policy"
---

**Average Effective Tariff Rate by Region**

Using tariff policy as of February 20, 2026, under the Current Policy scenario. Pre- and post-substitution. Percent.

_Notes: Published in the original release as Table 2, which already reports Average Effective Tariff Rate, Share of Goods Imports, and Contribution as three parallel metrics per region -- no reconstruction needed, unlike several mid-2025 vintages where these had to be added. Table only, no chart, following the same standing preference established in the 2026-02-21 reference vintage._

_Source: GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
