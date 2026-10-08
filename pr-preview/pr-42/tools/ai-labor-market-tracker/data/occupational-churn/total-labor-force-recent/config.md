---
short_label: Total Labor Force, Recent
charts:
- chartType: line
  title: Changes in the Occupational Mix From Recent Baselines
  subtitle: Dissimilarity index (percentage points). {variant} baseline.
  source: CPS, The Budget Lab analysis
  note: Dissimilarity index is calculated using a 12-month moving average of employment
    data
  xAxisType: numeric
  data: data.csv
  variants:
  - id: rolling
    xAxisType: temporal
  - id: indexed
    x_axis_title: Months from baseline
---

The figure shows an occupational dissimilarity index for the entire labor force, calculated either on a rolling year-over-year basis or from a fixed base period. Index values can be interpreted as the percentage point change in the occupational composition of the labor force.