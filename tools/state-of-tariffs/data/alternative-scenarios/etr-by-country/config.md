---
short_label: Effective Rate by Country
figureType: table
scenario_role: stub
spec:
  title: Average Effective Tariff Rate by Country
  subtitle: Change from baseline at the end of 2026, by scenario. Percent.
  data: data.csv
  collapsible:
    default: collapsed
    expanded: [China, Total]
  stub:
  - category
  - scenario
  header:
  - measure
  - substitution
  value: value
  # column_order orders the leaf tier (substitution) within each measure super-group; the engine
  # (≥1.3.1) keeps the super-groups contiguous. column_group_order sets the super-group order.
  column_group_order:
  - level
  - delta_vs_default
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
