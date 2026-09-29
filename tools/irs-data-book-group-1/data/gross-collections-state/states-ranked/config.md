---
short_label: All States, One Year
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
    default: total_collections
    options:
      - id: total_collections
        label: All gross collections
      - id: business_income_taxes
        label: Business income taxes
      - id: individual_employment_total
        label: Individual income and employment taxes
      - id: individual_income_tax_withheld_fica
        label: Income tax withheld and FICA
      - id: individual_income_tax_not_withheld_seca
        label: Income tax not withheld and SECA
      - id: unemployment_insurance_tax
        label: Unemployment insurance
      - id: railroad_retirement_tax
        label: Railroad retirement
      - id: estate_and_trust_income_tax
        label: Estate and trust income tax (FY2009-)
      - id: estate_tax
        label: Estate tax
      - id: gift_tax
        label: Gift tax
      - id: excise_taxes
        label: Excise taxes
variants:
  - id: nominal
    spec:
      subtitle: '{measure}. Billions of nominal dollars.'
      value_prefix: $
      value_suffix: B
  - id: real
    spec:
      subtitle: '{measure}. Billions of FY2025 dollars.'
      value_prefix: $
      value_suffix: B
  - id: per_resident
    spec:
      subtitle: '{measure}. Dollars per resident.'
      value_prefix: $
      value_suffix: ''
  - id: share
    spec:
      subtitle: '{measure}. Share of the U.S. total.'
      value_prefix: ''
      value_suffix: '%'
spec:
  chartType: bar
  data: data.csv
  orientation: horizontal
  xAxisType: categorical
  title: Gross Collections by State, {year}
  subtitle: '{measure}.'
  source: IRS Data Book, Table 1-5; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  note: “Receipts shown for the various States do not indicate the Federal tax burden
    of each, since, in many instances, taxes are collected in one State from residents
    of, or operations in, another.” (FY1999 book, note 1.)
  highlight_from: state
  columns:
    x: state
    value: value
  bar_color: '#0072B2'
---

Every state, largest first, for the year and type of tax you pick.
