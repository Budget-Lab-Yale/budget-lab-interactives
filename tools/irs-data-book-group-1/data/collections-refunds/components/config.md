---
short_label: Parts of Each Tax
selectors:
  - id: tax_type
    label: Type of tax
    kind: single
    default: individual
    options:
      - id: individual
        label: Individual income taxes
      - id: employment
        label: Employment taxes
      - id: business
        label: Business income taxes
      - id: estate_gift
        label: Estate and gift taxes
spec:
  chartType: line
  data: data.csv
  title: Gross Collections by Part, FY1994-2025
  subtitle: '{tax_type}. {dollars}.'
  source: IRS Data Book, Table 1-1; The Budget Lab analysis.
  note: 'Real dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026),
    fiscal-year average, FY2025 dollars.'
  xAxisType: numeric
  series_order:
    - Withheld
    - Payments (from FY2008)
    - Estate and trust income tax (from FY2008)
    - 'Other: payments plus estate and trust (to FY2008)'
    - FICA
    - SECA
    - Unemployment insurance
    - Railroad retirement
    - Corporation income tax
    - Tax-exempt organizations' unrelated business income tax
    - Estate tax
    - Gift tax
  series_colors:
    Withheld: '#0072B2'
    Payments (from FY2008): '#E69F00'
    Estate and trust income tax (from FY2008): '#B8302C'
    'Other: payments plus estate and trust (to FY2008)': '#8856BF'
    FICA: '#0072B2'
    SECA: '#E69F00'
    Unemployment insurance: '#B8302C'
    Railroad retirement: '#8856BF'
    Corporation income tax: '#0072B2'
    Tax-exempt organizations' unrelated business income tax: '#E69F00'
    Estate tax: '#0072B2'
    Gift tax: '#E69F00'
  value_prefix: $
  value_suffix: B
---

The parts of each type of tax, as the Data Book prints them. Individual income tax payments and estate and trust income tax are printed separately from the FY2008 book on; before that they are one line, `Other`, and FY2008 is the one year all three appear. Excise taxes have no parts in this table.
