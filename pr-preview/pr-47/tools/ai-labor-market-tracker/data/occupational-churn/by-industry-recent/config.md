---
short_label: By Industry, Recent
charts:
- chartType: line
  title: Changes in the Occupational Mix Within the {industry} Industry
  subtitle: Dissimilarity index (percentage points). {variant} baseline.
  source: CPS, The Budget Lab analysis
  note: Dissimilarity index is calculated using a 12-month moving average of employment
    data
  xAxisType: numeric
  yAxisPolicy:
    min: 0
    max: 16
    tickCount: 5
    autoWiden:
      step: 4
  data: data.csv
  variants:
  - id: rolling
    xAxisType: temporal
  - id: indexed
    x_axis_title: Months from baseline
  selectors:
  - id: industry
    kind: single
    ui: title-inline
    default: information
    options:
    - id: natural-resources-and-mining
      label: Natural Resources and Mining
    - id: construction
      label: Construction
    - id: manufacturing
      label: Manufacturing
    - id: trade-transportation-and-utilities
      label: Trade, Transportation, and Utilities
    - id: information
      label: Information
    - id: financial-activities
      label: Financial Activities
    - id: professional-and-business-services
      label: Professional and Business Services
    - id: education-and-health-services
      label: Education and Health Services
    - id: leisure-and-hospitality
      label: Leisure and Hospitality
    - id: other-services
      label: Other Services
---

The figure shows an occupational dissimilarity index for selected industries, calculated either on a rolling year-over-year basis or from a fixed base period. Index values can be interpreted as the percentage point change in the occupational composition of each industry.