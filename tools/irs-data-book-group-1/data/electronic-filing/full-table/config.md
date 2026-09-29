---
short_label: The Full Table
figureType: table
selectors:
  - id: measure
    label: Measure
    kind: single
    default: total_returns
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
spec:
  title: Returns Filed Electronically by State, FY2000-2025
  subtitle: '{measure}. Number of returns.'
  data: data.csv
  stub:
    - row
  header:
    - year
  value: value
  source: IRS Data Book, Table 1-4.
  column_order:
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
    - All other
    - American Samoa
    - Armed Forces--All other overseas
    - Armed Forces--Americas
    - Armed Forces--Other
    - Armed Forces--Pacific
    - Foreign countries
    - Guam
    - International
    - Northern Mariana Islands
    - Other
    - Puerto Rico
    - U.S. Virgin Islands
  sticky:
    firstColumn: yes
  column_width: 110.0
  format:
    default:
      type: number
      decimals: 0.0
      thousands: yes
---

Every row of Table 1-4 for the type you pick.
