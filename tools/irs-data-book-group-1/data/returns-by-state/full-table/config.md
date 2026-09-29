---
short_label: The Full Table
figureType: table
selectors:
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
spec:
  title: Returns Filed by State, FY1998-2025
  subtitle: '{measure}. Number of returns.'
  data: data.csv
  stub:
    - row
  header:
    - year
  value: value
  source: IRS Data Book, Table 1-3.
  column_order:
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
  row_order:
    - United States total
    - Alabama
    - Alaska
    - Arizona
    - Arkansas
    - California
    - Colorado
    - Connecticut
    - Delaware
    - District of Columbia
    - Florida
    - Georgia
    - Hawaii
    - Idaho
    - Illinois
    - Indiana
    - Iowa
    - Kansas
    - Kentucky
    - Louisiana
    - Maine
    - Maryland
    - Massachusetts
    - Michigan
    - Minnesota
    - Mississippi
    - Missouri
    - Montana
    - Nebraska
    - Nevada
    - New Hampshire
    - New Jersey
    - New Mexico
    - New York
    - North Carolina
    - North Dakota
    - Ohio
    - Oklahoma
    - Oregon
    - Pennsylvania
    - Rhode Island
    - South Carolina
    - South Dakota
    - Tennessee
    - Texas
    - Utah
    - Vermont
    - Virginia
    - Washington
    - West Virginia
    - Wisconsin
    - Wyoming
    - Arkansas-Oklahoma
    - Brooklyn
    - Central California
    - Connecticut-Rhode Island
    - Delaware-Maryland
    - Gulf Coast
    - Houston
    - International
    - Kansas-Missouri
    - Kentucky-Tennessee
    - Los Angeles
    - Manhattan
    - Maryland and District of Columbia
    - Midstates Region
    - Midwest
    - New England
    - North-South Carolina
    - North Central
    - North Florida
    - North Texas
    - Northeast Region
    - Northern California
    - Other
    - Pacific-Northwest
    - Puerto Rico
    - Rocky Mountain
    - South Florida
    - South Texas
    - Southeast Region
    - Southern California
    - Southwest
    - Upstate New York
    - Virginia-West Virginia
    - Western Region
  sticky:
    firstColumn: yes
  column_width: 110.0
  format:
    default:
      type: number
      decimals: 0.0
      thousands: yes
---

Every row of Table 1-3 for the type you pick, IRS districts and regions of FY1998-99 included.
