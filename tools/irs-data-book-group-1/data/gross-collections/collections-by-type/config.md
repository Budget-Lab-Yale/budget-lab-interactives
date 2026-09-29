---
short_label: Collections by Type of Tax
spec:
  chartType: area
  data: data.csv
  title: Gross Collections by Type of Tax, FY1960-2025
  subtitle: '{dollars}.'
  source: IRS Data Book, Table 1-6; The Budget Lab analysis.
  note: 'Real dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026),
    fiscal-year average, FY2025 dollars.'
  xAxisType: numeric
  value_prefix: $
  value_suffix: T
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
  annotations:
    xAxis:
      - x: '1977'
        label: 'FY1977: fiscal year moves to Oct-Sep'
        style: dashed
        color: grey
        labelSide: right
      - x: '1988'
        label: 'FY1988: alcohol and tobacco excise to ATF'
        style: dashed
        color: grey
        labelSide: right
      - x: '2009'
        label: 'FY2009: adjustments and credits excluded'
        style: dashed
        color: grey
        labelSide: left
---

Gross collections by type of tax. The five types add up to the printed total in 65 of 66 years; FY2011 misses by $3 thousand, rounding.
