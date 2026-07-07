---
short_label: Effective Rate by Country
figureType: table
scenario_role: stub
collapsible:
  default: collapsed
  expanded: [China, Total]
spec:
  title: Average Effective Tariff Rate by Country
  subtitle: Change from baseline at the end of 2026, by scenario. Percent.
  data: data.csv
  stub:
  - category
  - scenario
  header:
  - measure
  - substitution
  value: value
  column_order:
  - presub
  - postsub
  header_labels:
    level: Levels
    delta_vs_default: Change vs. default
    presub: Pre-substitution
    postsub: Post-substitution
  format:
    default:
      type: number
      decimals: 1
      suffix: "%"
  source: GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis.
---

The average effective U.S. tariff rate by trading partner (row groups) and policy scenario,
shown as both levels and change vs. the default scenario. Click a partner to expand or collapse
its scenarios.
