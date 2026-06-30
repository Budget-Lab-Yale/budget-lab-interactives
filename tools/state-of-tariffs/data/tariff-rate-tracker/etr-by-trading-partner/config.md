---
short_label: ETR by Trading Partner
figureType: chart
events: [major, projection]
spec:
  chartType: line
  data: data.csv
  title: Daily ETR by Trading Partner (Excluding China)
  subtitle: Import-weighted tariff rate by partner region, excluding China. Percent.
  note: "Partners: Canada, Mexico, EU-27, UK, Japan, FTA Partners, Rest of World. Section 122 expiry applied at 2026-07-23."
  source: Yale Budget Lab Tariff Rate Tracker.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 20
    tickCount: 5
  series_order:
  - Canada
  - Mexico
  - EU-27
  - UK
  - Japan
  - FTA Partners
  - Rest of World
---

The import-weighted effective tariff rate by partner region (excluding China).
