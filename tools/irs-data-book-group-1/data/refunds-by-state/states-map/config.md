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
      - id: '1997'
        label: FY1997
      - id: '1996'
        label: FY1996
      - id: '1995'
        label: FY1995
  - id: measure
    label: Measure
    kind: single
    default: total_excl
    options:
      - id: total_refunds
        label: All refunds
      - id: total_excl
        label: All refunds, less stimulus and advance payments
      - id: individual_excl
        label: Individual income tax, less stimulus and advance payments
      - id: stimulus
        label: Stimulus and advance payments (FY2008-09, FY2020-22)
      - id: business_income_taxes
        label: Business income taxes
      - id: employment_taxes
        label: Employment taxes
      - id: excise_taxes
        label: Excise taxes
      - id: estate_tax
        label: Estate tax
      - id: gift_tax
        label: Gift tax
      - id: estate_and_trust_income_tax
        label: Estate and trust income tax (FY2009-)
variants:
  - id: count
    spec:
      subtitle: '{measure}. Refunds issued.'
      value_suffix: ''
  - id: per_1000
    spec:
      subtitle: '{measure}. Refunds per 1,000 residents.'
      value_suffix: ''
spec:
  chartType: tilemap
  data: data.csv
  title: Refunds Issued by State, {year}
  subtitle: '{measure}.'
  source: IRS Data Book, Table 1-7; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  note: 'Five bins, each with a fifth of the states. Grey: the book printed no figure
    that is that state.'
  highlight_from: state
  bins: 5.0
  note_texts:
    n1: 'IRS misprint: about 4.6 million against roughly 1.5 million in the years
      either side (IRS_SOURCE_ERRORS).'
    n2: Not shown by the IRS (suppressed).
    n3: Reported as the Aberdeen IRS district.
    n4: Reported as the Albuquerque IRS district.
    n5: Reported as the Anchorage IRS district.
    n6: Reported as the Atlanta IRS district.
    n7: Reported as the Augusta IRS district.
    n8: Reported as the Birmingham IRS district.
    n9: Reported as the Boise IRS district.
    n10: Reported as the Boston IRS district.
    n11: Reported as the Burlington IRS district.
    n12: Reported as the Cheyenne IRS district.
    n13: Reported as the Columbia IRS district.
    n14: Reported as the Denver IRS district.
    n15: Reported as the Des Moines IRS district.
    n16: Reported as the Detroit IRS district.
    n17: Reported as the Fargo IRS district.
    n18: Reported as the Georgia IRS district.
    n19: Reported as the Greensboro IRS district.
    n20: Reported as the Hartford IRS district.
    n21: Reported as the Helena IRS district.
    n22: Reported as the Honolulu IRS district.
    n23: Reported as the Illinois IRS district.
    n24: Reported as the Indiana IRS district.
    n25: Reported as the Indianapolis IRS district.
    n26: Reported as the Jackson IRS district.
    n27: Reported as the Las Vegas IRS district.
    n28: Reported as the Little Rock IRS district.
    n29: Reported as the Louisville IRS district.
    n30: Reported as the Michigan IRS district.
    n31: Reported as the Milwaukee IRS district.
    n32: Reported as the Nashville IRS district.
    n33: Reported as the New Jersey IRS district.
    n34: Reported as the New Orleans IRS district.
    n35: Reported as the Newark IRS district.
    n36: Reported as the Ohio IRS district.
    n37: Reported as the Oklahoma City IRS district.
    n38: Reported as the Omaha IRS district.
    n39: Reported as the Parkersburg IRS district.
    n40: Reported as the Pennsylvania IRS district.
    n41: Reported as the Phoenix IRS district.
    n42: Reported as the Portland IRS district.
    n43: Reported as the Portsmouth IRS district.
    n44: Reported as the Providence IRS district.
    n45: Reported as the Richmond IRS district.
    n46: Reported as the Salt Lake City IRS district.
    n47: Reported as the Seattle IRS district.
    n48: Reported as the St. Louis IRS district.
    n49: Reported as the St. Paul IRS district.
    n50: Reported as the Wichita IRS district.
    n51: Reported as the Wilmington IRS district.
    n52: The book's memo total for the state, over its IRS districts.
    n53: 'The book''s memo total for the state, over its IRS districts. IRS misprint:
      the memo total does not equal its two districts (IRS_SOURCE_ERRORS).'
    n54: The book prints one line for Maryland and the District of Columbia.
  columns:
    state: state
    abbr: abbr
    value: value
    note: note
---

A square per state. The map starts on refunds less stimulus and advance payments: with the payments in, FY2020-22 per-resident refunds mostly follow payment eligibility. FY1995-96 fill 49 states from districts and memo totals, and FY1997 fills 7.
