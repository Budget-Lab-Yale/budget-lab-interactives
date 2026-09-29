---
short_label: The Full Table
figureType: table
selectors:
  - id: measure
    label: Measure
    kind: single
    default: gross_collections
    options:
      - id: gross_collections
        label: Gross collections
      - id: refunds
        label: Refunds
      - id: net_collections
        label: Net collections
spec:
  title: Collections and Refunds by Type of Tax, FY1994-2025
  subtitle: '{measure}. Thousands of dollars, as printed.'
  data: data.csv
  stub:
    - group
    - row
  header:
    - year
  value: value
  source: IRS Data Book, Table 1-1.
  column_order:
    - FY1994
    - FY1995
    - FY1996
    - FY1997
    - FY1998
    - FY1999
    - FY2000
    - FY2001
    - FY2002
    - FY2003
    - FY2004
    - FY2005
    - FY2006
    - FY2007
    - FY2008
    - FY2009
    - FY2010
    - FY2011
    - FY2012
    - FY2013
    - FY2014
    - FY2015
    - FY2016
    - FY2017
    - FY2018
    - FY2019
    - FY2020
    - FY2021
    - FY2022
    - FY2023
    - FY2024
    - FY2025
  group_order:
    - United States
    - Individual income taxes
    - Employment taxes
    - Business income taxes
    - Excise taxes
    - Estate and gift taxes
  row_order:
    - Total
    - Income taxes, total (FY1994-1995 books)
    - Withheld
    - Payments (from FY2008)
    - Estate and trust income tax (from FY2008)
    - 'Other: payments plus estate and trust (to FY2008)'
    - Old-age, survivors, disability and hospital insurance, total
    - FICA
    - SECA
    - Unemployment insurance
    - Railroad retirement
    - Corporation income tax
    - Tax-exempt organizations' unrelated business income tax
    - Estate tax
    - Gift tax
  sticky:
    firstColumn: yes
  column_width: 118.0
  format:
    default:
      type: number
      decimals: 0.0
      thousands: yes
---

Every figure in Table 1-1 as the IRS printed it, in thousands of dollars. The Data Book page of this repository carries the notes, markers and hierarchy in full.
