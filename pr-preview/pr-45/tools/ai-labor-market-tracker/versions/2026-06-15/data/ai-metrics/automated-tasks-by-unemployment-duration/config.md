---
short_label: Automated Tasks by Unemployment Duration
charts:
- chartType: line
  title: Proportion of Occupation-Level AI Usage Automating Tasks Amongst Unemployed
    Workers by Duration of Unemployment
  subtitle: Percent. Three-month moving average. {panel}.
  source: CPS, Anthropic, The Budget Lab analysis
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

Using aggregated Anthropic data on how AI is used by their customers across Claude and Claude API, the figure shows the shares of automated tasks for unemployed workers, distinguished by duration of their unemployment. Results can be shown with observed tasks only or with missing tasks coded as zeroes.