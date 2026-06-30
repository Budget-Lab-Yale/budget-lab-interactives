---
short_label: ETR by Authority
figureType: chart
events: [major, projection]
spec:
  chartType: area
  data: data.csv
  title: Effective Tariff Rate by Authority
  subtitle: Import-weighted ETR decomposed by tariff authority, including base (MFN) rate. Percent.
  note: Authorities generally stack with mutual exclusion, except for certain 232 and IEEPA/122 country-product pairs.
  source: Yale Budget Lab Tariff Rate Tracker.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 25
    tickCount: 5
  series_order:
  - Base Rate
  - Section 232
  - Section 301
  - IEEPA Reciprocal
  - IEEPA Fentanyl
  - Section 122
---

The daily effective tariff rate decomposed into its contributing authorities, stacked on top of the base (MFN) rate. The series sum to the total effective rate shown in the daily-rate figure.
