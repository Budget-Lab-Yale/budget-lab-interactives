---
short_label: Average Effective Rate by Country
figureType: table
spec:
  title: Average Effective US Tariff Rate at the End of 2026, Trump Administration Tariffs
  subtitle: Change from baseline, pre- and post-substitution.
  data: data.csv
  stub:
  - scenario
  - label: country
  header:
  - metric
  - leaf
  value: value
  # Leaf keys must be globally unique (the model keys columns by leaf value); the metric tier
  # supplies the spanning banner and header_labels render the shared Pre/Post text.
  column_order: [avg-pre, avg-post, share-pre, share-post, contrib-pre, contrib-post]
  header_labels:
    avg-pre: Pre-sub
    avg-post: Post-sub
    share-pre: Pre-sub
    share-post: Post-sub
    contrib-pre: Pre-sub
    contrib-post: Post-sub
  format:
    default: { type: number, decimals: 1 }
    columns:
      share-pre: { type: number, decimals: 1, suffix: "%" }
      share-post: { type: number, decimals: 1, suffix: "%" }
  source: GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis.
---

A country-level breakdown of the average effective US tariff rate at the end of 2026, the share of goods imports each partner accounts for, and each partner's contribution to the overall rate — shown before and after trade substitution, under both Section 122 scenarios.
