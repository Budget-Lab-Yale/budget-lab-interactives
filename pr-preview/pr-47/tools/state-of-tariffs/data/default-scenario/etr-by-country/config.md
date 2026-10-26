---
short_label: Effective Rate by Trading Partner
figureType: table
spec:
  title: Average Effective Tariff Rate by Trading Partner
  subtitle: Change from baseline at the end of 2026, pre- and post-substitution. Percent.
  data: data.csv
  stub:
  - category
  header:
  - substitution
  value: value
  column_order:
  - presub
  - postsub
  header_labels:
    presub: Pre-substitution
    postsub: Post-substitution
  format:
    default:
      type: number
      decimals: 1
      suffix: "%"
  emphasis_rows:
  - Total
  source: GTAP v7 [Corong et al. (2017)], GTAP-RD, The Budget Lab analysis.
---

The average effective U.S. tariff rate by trading partner, before and after trade substitution.
