---
short_label: Unemployment Rate
charts:
- chartLetter: a
  chartType: line
  title: Unemployment Rates for AI-Exposed and Comparable Unexposed Occupations
  subtitle: Log rate
  source: BLS via IPUMS-CPS and The Budget Lab analysis
  xAxisType: quarterly
  series_order:
  - Synthetic
  - Treated
  series_colors:
    Treated: '#0072B2'
    Synthetic: '#0072B2'
  series_styles:
    Synthetic:
      dashed: true
  series_labels:
    Treated: AI-Exposed
    Synthetic: Synthetic AI-Unexposed
  data: data.csv
- chartLetter: b
  chartType: line
  title: Event Study with SDID Point Estimates
  subtitle: Percentage point difference
  source: BLS via IPUMS-CPS and The Budget Lab analysis
  note: 95% confidence intervals and estimated impacts are calculated according to
    the procedure outlined in Clarke et al. (2022).
  xAxisType: quarterly
  series_order:
  - Difference
  confidence_bands:
  - series: Difference
    lower: lower_ci
    upper: upper_ci
  data: data.csv
---

The first panel shows the average log unemployment rate of AI-exposed and synthetic AI-unexposed occupations over time, with the vertical dashed line corresponding to the late 2022 introduction of modern large-language models. The second panel shows the difference in exposed and synthetic unexposed outcomes, along with confidence intervals for those point estimates. Estimates are generated using synthetic differences-in-differences.  