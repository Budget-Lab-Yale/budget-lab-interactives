---
short_label: Major Industries, Historical
charts:
- chartType: line
  title: Changes in the Occupational Mix Since 2004 by Major Industry
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

The figure shows an occupational dissimilarity index for major industries, calculated either on a rolling year-over-year basis or from 2004. Index values can be interpreted as the percentage point change in the occupational composition of each industry.