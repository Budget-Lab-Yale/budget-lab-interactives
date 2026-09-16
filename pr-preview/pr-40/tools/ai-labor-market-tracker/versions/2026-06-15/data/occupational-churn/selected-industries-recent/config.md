---
short_label: Selected Industries, Recent
charts:
- chartType: line
  title: Changes in the Occupational Mix in Selected Industries
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
---

The figure shows an occupational dissimilarity index for selected industries, calculated either on a rolling year-over-year basis or from a fixed base period. Index values can be interpreted as the percentage point change in the occupational composition of each industry.