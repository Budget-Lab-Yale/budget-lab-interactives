---
short_label: Augmented Occupations by Unemployment Duration
charts:
- chartType: line
  title: Proportion of Workers in Occupations Augmented by AI by Duration of Unemployment
  subtitle: Percent. Three-month moving average. {panel}.
  source: CPS, Anthropic, The Budget Lab analysis
  note: Occupations are considered augmented if more than half of AI usage indicates
    task augmentation.
  series_order:
  - '<5 Weeks'
  - '5-14 Weeks'
  - '15-26 Weeks'
  - '27+ Weeks'
  xAxisType: temporal
  data: data.csv
  variants:
  - id: observed
  - id: missing-as-zero
---

Using aggregated Anthropic data on how AI is used by their customers across Claude and Claude API, the figure shows the shares of unemployed workers in occupations where more than half of their tasks are augmented, distinguished by duration of their unemployment. Results can be shown with observed tasks only or with missing tasks coded as zeroes.