---
short_label: One State, One Year
figureType: table
lead: yes
selectors:
  - id: state
    label: State
    kind: single
    default: United States
    options:
      - id: United States
        label: United States
      - id: Alabama
        label: Alabama
      - id: Alaska
        label: Alaska
      - id: Arizona
        label: Arizona
      - id: Arkansas
        label: Arkansas
      - id: California
        label: California
      - id: Colorado
        label: Colorado
      - id: Connecticut
        label: Connecticut
      - id: Delaware
        label: Delaware
      - id: District of Columbia
        label: District of Columbia
      - id: Florida
        label: Florida
      - id: Georgia
        label: Georgia
      - id: Hawaii
        label: Hawaii
      - id: Idaho
        label: Idaho
      - id: Illinois
        label: Illinois
      - id: Indiana
        label: Indiana
      - id: Iowa
        label: Iowa
      - id: Kansas
        label: Kansas
      - id: Kentucky
        label: Kentucky
      - id: Louisiana
        label: Louisiana
      - id: Maine
        label: Maine
      - id: Maryland
        label: Maryland
      - id: Massachusetts
        label: Massachusetts
      - id: Michigan
        label: Michigan
      - id: Minnesota
        label: Minnesota
      - id: Mississippi
        label: Mississippi
      - id: Missouri
        label: Missouri
      - id: Montana
        label: Montana
      - id: Nebraska
        label: Nebraska
      - id: Nevada
        label: Nevada
      - id: New Hampshire
        label: New Hampshire
      - id: New Jersey
        label: New Jersey
      - id: New Mexico
        label: New Mexico
      - id: New York
        label: New York
      - id: North Carolina
        label: North Carolina
      - id: North Dakota
        label: North Dakota
      - id: Ohio
        label: Ohio
      - id: Oklahoma
        label: Oklahoma
      - id: Oregon
        label: Oregon
      - id: Pennsylvania
        label: Pennsylvania
      - id: Rhode Island
        label: Rhode Island
      - id: South Carolina
        label: South Carolina
      - id: South Dakota
        label: South Dakota
      - id: Tennessee
        label: Tennessee
      - id: Texas
        label: Texas
      - id: Utah
        label: Utah
      - id: Vermont
        label: Vermont
      - id: Virginia
        label: Virginia
      - id: Washington
        label: Washington
      - id: West Virginia
        label: West Virginia
      - id: Wisconsin
        label: Wisconsin
      - id: Wyoming
        label: Wyoming
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
spec:
  title: Refunds Issued in {state}, {year}
  subtitle: Number of refunds, by type of tax.
  data: data.csv
  stub:
    - measure
  header:
    - metric
  value: value
  source: IRS Data Book, Table 1-7; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  row_order:
    - All refunds
    - All refunds, less stimulus and advance payments
    - Individual income tax, less stimulus and advance payments
    - Stimulus and advance payments (FY2008-09, FY2020-22)
    - Business income taxes
    - Employment taxes
    - Excise taxes
    - Estate tax
    - Gift tax
    - Estate and trust income tax (FY2009-)
  column_order:
    - Refunds issued
    - Per 1,000 residents
  format:
    default:
      type: number
      decimals: 0.0
      thousands: yes
    columns:
      Per 1,000 residents:
        type: number
        decimals: 1.0
---

Refunds for one state and year. Stimulus and advance payments are inside the IRS's totals; the rows that exclude them are the printed figure less the IRS's own payment columns. 
