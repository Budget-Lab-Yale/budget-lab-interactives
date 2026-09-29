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
  - id: measure
    label: Measure
    kind: single
    default: individual_income_tax_total
    options:
      - id: total_returns
        label: All returns
      - id: individual_income_tax_total
        label: Individual income tax
      - id: individual_practitioner_total
        label: 'Individual: by a practitioner'
      - id: individual_online_total
        label: 'Individual: self-prepared online'
      - id: individual_online_free_file
        label: 'Individual: Free File (FY2009-)'
      - id: individual_online_direct_file
        label: 'Individual: Direct File (FY2024-)'
      - id: individual_telefile
        label: 'Individual: TeleFile (to FY2005)'
      - id: employment_taxes
        label: Employment tax
      - id: partnership
        label: Partnership
      - id: s_corporation
        label: S corporation
      - id: c_corporation_income_tax
        label: C corporation
      - id: estate_and_trust_income_tax
        label: Estate and trust
      - id: tax_exempt_organizations
        label: Tax-exempt organizations
      - id: excise_taxes
        label: Excise tax (FY2014-)
      - id: supplemental_documents
        label: Supplemental documents (FY2008-)
variants:
  - id: share
    spec:
      subtitle: '{measure}. Share of returns filed electronically.'
      value_suffix: '%'
  - id: count
    spec:
      subtitle: '{measure}. Returns e-filed.'
      value_suffix: ''
  - id: per_1000
    spec:
      subtitle: '{measure}. E-filed returns per 1,000 residents.'
      value_suffix: ''
spec:
  chartType: tilemap
  data: data.csv
  title: E-filing by State, {year}
  subtitle: '{measure}.'
  source: IRS Data Book, Tables 1-3 and 1-4; Census Bureau population estimates (FRED);
    The Budget Lab analysis.
  note: 'Five bins, each with a fifth of the states. Grey: no figure, or a type not
    yet published that year.'
  highlight_from: state
  bins: 5.0
  note_texts:
    n1: Not a Direct File state in FY2024 (one of twelve; FY2024 book, note 6).
    n2: Not shown by the IRS (suppressed).
  columns:
    state: state
    abbr: abbr
    value: value
    note: note
---

A square per state. Types the book begins to publish later are grey before their first year: excise from FY2014, supplemental documents from FY2008. Direct File FY2024 has figures for its twelve states only.
