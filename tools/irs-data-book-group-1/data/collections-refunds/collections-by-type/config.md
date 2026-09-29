---
short_label: Collections by Type of Tax
selectors:
  - id: measure
    label: Measure
    kind: single
    default: gross
    options:
      - id: gross
        label: Gross collections
      - id: net
        label: Net collections
spec:
  chartType: area
  data: data.csv
  title: Federal Tax Collections by Type of Tax, FY1994-2025
  subtitle: '{measure}. {dollars}.'
  source: IRS Data Book, Table 1-1; The Budget Lab analysis.
  note: 'Real dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026),
    fiscal-year average, FY2025 dollars.'
  xAxisType: numeric
  series_order:
    - Individual income taxes
    - Employment taxes
    - Business income taxes
    - Excise taxes
    - Estate and gift taxes
  series_colors:
    Individual income taxes: '#0072B2'
    Employment taxes: '#E69F00'
    Business income taxes: '#B8302C'
    Excise taxes: '#8856BF'
    Estate and gift taxes: '#2A8B3A'
  value_prefix: $
  value_suffix: T
---

The five types of tax the IRS collects. They add up to the printed U.S. total in every year and measure, so the top of the stack is the total. Net collections begin in FY1995. The share view uses the IRS's own printed percentages.
