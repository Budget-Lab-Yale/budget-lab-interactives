---
short_label: Daily Effective Tariff Rate
figureType: chart
events: [major, projection]
spec:
  chartType: line
  data: data.csv
  title: Daily Effective Tariff Rate
  subtitle: Import-weighted average across all products and countries. Percent.
  note: Rates weighted by 2024 annual Census import values at HS10 x country level.
  source: Yale Budget Lab Tariff Rate Tracker; 2024 Census import values.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 25
    tickCount: 5
---

The import-weighted average effective tariff rate across all products and countries, updated daily. Vertical markers flag major tariff-policy changes.
