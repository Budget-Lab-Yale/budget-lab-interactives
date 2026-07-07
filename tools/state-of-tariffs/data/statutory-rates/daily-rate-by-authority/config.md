---
short_label: By Authority
figureType: chart
events: [major, projection]
scenario_role: selector
spec:
  chartType: area
  data: data.csv
  title: Statutory Tariff Rate by Authority — {scenario}
  subtitle: Import-weighted statutory rate, decomposed by tariff authority. Percent.
  source: The Budget Lab analysis.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 30
    tickCount: 6
  series_order:
  - base
  - section_232
  - section_301
  - section_201
  - ieepa
  - fentanyl
  - section_122
  - other
  series_labels:
    base: Base (MFN) rate
    section_232: Section 232
    section_301: Section 301
    section_201: Section 201
    ieepa: IEEPA reciprocal
    fentanyl: IEEPA fentanyl
    section_122: Section 122
    other: Other
---

The daily statutory rate decomposed into its contributing authorities, stacked on the base
(MFN) rate. The series sum to the overall rate shown in the previous figure.
