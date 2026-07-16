---
short_label: Automated vs Augmented Occupations
charts:
- chartType: line
  title: Proportion of Workers in Occupations Automated and Augmented by AI (As Defined
    by Usage)
  subtitle: Percent. Three-month moving average. {panel}.
  source: CPS, Anthropic, The Budget Lab analysis
  note: Occupations are considered automated (augmented) if more than half of AI usage
    indicates task automation (augmentation).
  xAxisType: temporal
  data: data.csv
  variants:
  - id: observed
  - id: missing-as-zero
---

Using aggregated Anthropic data on how AI is used by their customers across Claude and Claude API, the figure shows the shares of workers in occupations where more than half of their tasks are either automated or augmented. Results can be shown with observed tasks only or with missing tasks coded as zeroes.