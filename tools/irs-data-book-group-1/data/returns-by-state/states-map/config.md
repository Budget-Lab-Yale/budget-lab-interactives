---
short_label: Map, One Year
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
  - id: measure
    label: Measure
    kind: single
    default: total
    options:
      - id: total
        label: All returns
      - id: individual_income
        label: Individual income tax
      - id: individual_estimated
        label: Individual estimated tax
      - id: employment
        label: Employment tax
      - id: supplemental
        label: Supplemental documents
      - id: partnership
        label: Partnership
      - id: s_corporation
        label: S corporation
      - id: c_corporation
        label: C corporation
      - id: corporation_total
        label: Corporation (to FY2003)
      - id: estate_trust
        label: Estate and trust
      - id: estate_trust_estimated
        label: Estate and trust estimated tax
      - id: tax_exempt
        label: Tax-exempt organizations
      - id: excise
        label: Excise tax
      - id: gift_tax
        label: Gift tax
      - id: estate_tax
        label: Estate tax
      - id: employee_plan
        label: Employee plans (to FY2002)
variants:
  - id: count
    spec:
      subtitle: '{measure}. Returns filed.'
      value_suffix: ''
  - id: per_1000
    spec:
      subtitle: '{measure}. Returns per 1,000 residents.'
      value_suffix: ''
spec:
  chartType: tilemap
  data: data.csv
  title: Returns Filed by State, {year}
  subtitle: '{measure}.'
  source: IRS Data Book, Table 1-3; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  note: 'Five bins, each with a fifth of the states. Grey: the book printed no figure
    that is that state.'
  highlight_from: state
  bins: 5.0
  note_texts:
    n1: Reported as the Georgia IRS district.
    n2: Reported as the Illinois IRS district.
    n3: Reported as the Indiana IRS district.
    n4: Reported as the Michigan IRS district.
    n5: Reported as the New Jersey IRS district.
    n6: Reported as the Ohio IRS district.
    n7: Reported as the Pennsylvania IRS district.
    n8: The book prints one line for Maryland and the District of Columbia.
  columns:
    state: state
    abbr: abbr
    value: value
    note: note
---

A square per state. FY1998-99 are reported by IRS district: seven states whose district was the whole state have a figure, and the rest are grey.
