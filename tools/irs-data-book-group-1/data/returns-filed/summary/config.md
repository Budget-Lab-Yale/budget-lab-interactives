---
short_label: Summary by Year
figureType: table
lead: yes
selectors:
  - id: year
    label: Fiscal year
    kind: single
    default: '2025'
    options:
      - id: '2025'
        label: FY2025
      - id: '2024'
        label: FY2024
      - id: '2023'
        label: FY2023
      - id: '2022'
        label: FY2022
      - id: '2021'
        label: FY2021
      - id: '2020'
        label: FY2020
      - id: '2019'
        label: FY2019
      - id: '2018'
        label: FY2018
      - id: '2017'
        label: FY2017
      - id: '2016'
        label: FY2016
      - id: '2015'
        label: FY2015
      - id: '2014'
        label: FY2014
      - id: '2013'
        label: FY2013
      - id: '2012'
        label: FY2012
      - id: '2011'
        label: FY2011
      - id: '2010'
        label: FY2010
      - id: '2009'
        label: FY2009
      - id: '2008'
        label: FY2008
      - id: '2007'
        label: FY2007
      - id: '2006'
        label: FY2006
      - id: '2005'
        label: FY2005
      - id: '2004'
        label: FY2004
      - id: '2003'
        label: FY2003
      - id: '2002'
        label: FY2002
      - id: '2001'
        label: FY2001
      - id: '2000'
        label: FY2000
      - id: '1999'
        label: FY1999
      - id: '1998'
        label: FY1998
      - id: '1997'
        label: FY1997
      - id: '1996'
        label: FY1996
      - id: '1995'
        label: FY1995
      - id: '1994'
        label: FY1994
spec:
  title: Returns Filed by Type of Return, {year}
  subtitle: Number of returns; change from the prior year as the IRS prints it.
  data: data.csv
  stub:
    - type
  header:
    - measure
  value: value
  source: IRS Data Book, Table 1-2; The Budget Lab analysis.
  row_order:
    - United States, total
    - Income tax returns, total
    - Individual income tax returns, total
    - Forms 1040, 1040A, 1040EZ and 1040PC (FY2000-)
    - Form 1040 (to FY2000)
    - Form 1040A (to FY2000)
    - Form 1040EZ (to FY2000)
    - Other individual returns, incl. 1040PC (to FY2000)
    - Other individual returns (FY2000-)
    - Individual estimated tax
    - Estate and trust
    - Estate and trust estimated tax
    - Corporation (to FY2003)
    - C or other corporation (FY2003-)
    - S corporation (FY2003-)
    - Partnership
    - Employment taxes
    - Estate tax
    - Gift tax
    - Excise taxes
    - Tax-exempt organizations
    - Employee plans (to FY2002)
    - Supplemental documents
  column_order:
    - Returns filed
    - Change from prior year
  emphasis_rows:
    - United States, total
  format:
    default:
      type: number
      decimals: 0.0
      thousands: yes
    columns:
      Change from prior year:
        type: number
        decimals: 1.0
        suffix: '%'
---

Returns filed with the IRS in the fiscal year you pick, by type of return. The percent change is the IRS's own printed figure, based on rounded data.
