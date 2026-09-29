---
short_label: The Full Table
figureType: table
selectors:
  - id: measure
    label: Measure
    kind: single
    default: total_refunds
    options:
      - id: total_refunds
        label: All refunds
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
spec:
  title: Amount of Refunds by State, FY1995-2025
  subtitle: '{measure}. Thousands of dollars, as printed.'
  data: data.csv
  stub:
    - row
  header:
    - year
  value: value
  source: IRS Data Book, Table 1-8.
  column_order:
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
    - A/C International
    - Aberdeen
    - Advance earned income tax credit
    - Advance Premium Tax Credit
    - Albany
    - Albuquerque
    - Anchorage
    - Arkansas-Oklahoma
    - Atlanta
    - Augusta
    - Austin
    - Baltimore
    - Birmingham
    - Boise
    - Boston
    - Brooklyn
    - Buffalo
    - Burlington
    - Central California
    - Central Region
    - Cheyenne
    - Chicago
    - Child tax credit
    - Cincinnati
    - Cleveland
    - Columbia
    - Connecticut-Rhode Island
    - Dallas
    - Delaware-Maryland
    - Denver
    - Des Moines
    - Detroit
    - Earned income tax credits
    - Excess FICA credits
    - Fargo
    - Ft. Lauderdale
    - Greensboro
    - Gulf Coast
    - Hartford
    - Helena
    - Highway and airport trust funds
    - Honolulu
    - Houston
    - Indianapolis
    - International
    - Jackson
    - Jacksonville
    - Kansas-Missouri
    - Kentucky-Tennessee
    - Laguna Niguel
    - Las Vegas
    - Little Rock
    - Los Angeles
    - Louisville
    - Manhattan
    - Maryland and District of Columbia
    - Mid-Atlantic Region
    - Midstates Region
    - Midwest
    - Midwest Region
    - Milwaukee
    - Nashville
    - New England
    - New Orleans
    - Newark
    - North-South Carolina
    - North Atlantic Region
    - North Central
    - North Florida
    - North Texas
    - Northeast Region
    - Northern California
    - Oklahoma City
    - Omaha
    - Other
    - Other refunds or credits
    - Pacific-Northwest
    - Parkersburg
    - Philadelphia
    - Phoenix
    - Pittsburgh
    - Portland
    - Portsmouth
    - Providence
    - Puerto Rico
    - Recovery Rebates funding provided to U.S. possessions
    - Refund adjustments and credits
    - Refund reversals unclassified
    - Richmond
    - Rocky Mountain
    - Sacramento
    - Salt Lake City
    - San Francisco
    - San Jose
    - Seattle
    - South Florida
    - South Texas
    - Southeast Region
    - Southern California
    - Southwest
    - Southwest Region
    - Springfield
    - St. Louis
    - St. Paul
    - U.S. Armed Services overseas and territories other than Puerto Rico
    - U.S. Customs and BATF
    - Undistributed
    - United States total including adjustments and credits
    - Upstate New York
    - Virginia-West Virginia
    - Western Region
    - Wichita
    - Wilmington
  sticky:
    firstColumn: yes
  column_width: 110.0
  format:
    default:
      type: number
      decimals: 0.0
      thousands: yes
---

Every row of Table 1-8 for the type you pick, districts and regions of FY1995-97 included.
