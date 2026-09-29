---
short_label: Share by Type of Tax
lead: yes
spec:
  chartType: line
  data: data.csv
  title: Share of Gross Collections by Type of Tax, FY1960-2025
  subtitle: Percent of total internal revenue collections.
  source: IRS Data Book, Table 1-6; The Budget Lab analysis.
  xAxisType: numeric
  value_suffix: '%'
  yAxisPolicy:
    min: 0.0
    includeZero: yes
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

Each type of tax as a share of all internal revenue collections, every fiscal year. Our figures: each type over the printed total. Individual income taxes include estate and trust income tax in every year, which the books print inside individual income tax through FY2007.
