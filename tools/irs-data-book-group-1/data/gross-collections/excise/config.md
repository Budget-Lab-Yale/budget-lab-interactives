---
short_label: Excise Taxes
spec:
  chartType: line
  data: data.csv
  title: Excise Tax Collections, FY1960-2025
  subtitle: '{dollars}. Each line is one definition; the IRS stopped collecting some
    excise taxes.'
  source: IRS Data Book, Table 1-6; The Budget Lab analysis.
  note: 'Real dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026),
    fiscal-year average, FY2025 dollars.'
  xAxisType: numeric
  value_prefix: $
  value_suffix: B
  series_order:
    - Including alcohol and tobacco (to FY1987)
    - Excluding alcohol and tobacco (FY1988-1990)
    - Excluding alcohol, tobacco and firearms (FY1991-)
  series_colors:
    Including alcohol and tobacco (to FY1987): '#8856BF'
    Excluding alcohol and tobacco (FY1988-1990): '#E69F00'
    Excluding alcohol, tobacco and firearms (FY1991-): '#0072B2'
---

The IRS collected taxes on alcohol and tobacco until FY1988, “and taxes on firearms until FY 1991” (FY2025 book, note 5). Those taxes went to the Alcohol and Tobacco Tax and Trade Bureau, so a single line would show a fall that is a change of collector. Firearms moved in the second quarter of FY1991.
