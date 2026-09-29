---
short_label: Estate and Gift Taxes
spec:
  chartType: line
  data: data.csv
  title: Estate and Gift Tax Collections, FY1960-2025
  subtitle: '{dollars}.'
  source: IRS Data Book, Table 1-6; The Budget Lab analysis.
  note: 'Real dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026),
    fiscal-year average, FY2025 dollars.'
  xAxisType: numeric
  value_prefix: $
  value_suffix: B
  series_colors:
    Estate tax: '#2A8B3A'
    Gift tax: '#E69F00'
  annotations:
    points:
      - x: '2011'
        series: Estate tax
        label: 'FY2011: 2010 estate tax repeal'
        connector: yes
        dx: -40.0
        dy: 30.0
---

Estate and gift tax collections. “The estate tax was temporarily repealed for deaths in Calendar Year (CY) 2010” before being reinstated retroactively (FY2025 book, note 7).
