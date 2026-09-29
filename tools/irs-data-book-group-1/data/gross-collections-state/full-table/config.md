---
short_label: The Full Table
figureType: table
selectors:
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
spec:
  title: Gross Collections by State, FY1998-2025
  subtitle: '{measure}. Thousands of dollars, as printed.'
  data: data.csv
  stub:
    - row
  header:
    - year
  value: value
  source: IRS Data Book, Table 1-5.
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
    - Adjustments and credits
    - Advance earned income tax credit
    - Excess FICA credits
    - Highway and airport trust funds
    - International
    - Maryland and District of Columbia
    - Other
    - Puerto Rico
    - U.S. Armed Services overseas and territories other than Puerto Rico
    - Undistributed
    - United States total including adjustments and credits
  sticky:
    firstColumn: yes
  column_width: 110.0
  format:
    default:
      type: number
      decimals: 0.0
      thousands: yes
---

Every row of Table 1-5 for the type of tax you pick, adjustments and undistributed amounts included.
