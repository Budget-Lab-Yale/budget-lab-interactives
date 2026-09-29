---
short_label: 'One State: E-file Share'
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
spec:
  chartType: line
  data: data.csv
  title: Share of Individual Returns Filed Electronically, {state}, FY2000-2025
  subtitle: 'Percent. Grey: the United States.'
  source: IRS Data Book, Tables 1-3 and 1-4; Census Bureau population estimates (FRED);
    The Budget Lab analysis.
  xAxisType: numeric
  value_suffix: '%'
  yAxisPolicy:
    min: 0.0
    max: 100.0
  series_colors:
    United States: '#9A9A9A'
    Alabama: '#0072B2'
    Alaska: '#0072B2'
    Arizona: '#0072B2'
    Arkansas: '#0072B2'
    California: '#0072B2'
    Colorado: '#0072B2'
    Connecticut: '#0072B2'
    Delaware: '#0072B2'
    District of Columbia: '#0072B2'
    Florida: '#0072B2'
    Georgia: '#0072B2'
    Hawaii: '#0072B2'
    Idaho: '#0072B2'
    Illinois: '#0072B2'
    Indiana: '#0072B2'
    Iowa: '#0072B2'
    Kansas: '#0072B2'
    Kentucky: '#0072B2'
    Louisiana: '#0072B2'
    Maine: '#0072B2'
    Maryland: '#0072B2'
    Massachusetts: '#0072B2'
    Michigan: '#0072B2'
    Minnesota: '#0072B2'
    Mississippi: '#0072B2'
    Missouri: '#0072B2'
    Montana: '#0072B2'
    Nebraska: '#0072B2'
    Nevada: '#0072B2'
    New Hampshire: '#0072B2'
    New Jersey: '#0072B2'
    New Mexico: '#0072B2'
    New York: '#0072B2'
    North Carolina: '#0072B2'
    North Dakota: '#0072B2'
    Ohio: '#0072B2'
    Oklahoma: '#0072B2'
    Oregon: '#0072B2'
    Pennsylvania: '#0072B2'
    Rhode Island: '#0072B2'
    South Carolina: '#0072B2'
    South Dakota: '#0072B2'
    Tennessee: '#0072B2'
    Texas: '#0072B2'
    Utah: '#0072B2'
    Vermont: '#0072B2'
    Virginia: '#0072B2'
    Washington: '#0072B2'
    West Virginia: '#0072B2'
    Wisconsin: '#0072B2'
    Wyoming: '#0072B2'
---

E-filed individual returns over all individual returns filed, for the state you pick against the country.
