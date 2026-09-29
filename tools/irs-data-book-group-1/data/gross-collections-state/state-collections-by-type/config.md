---
short_label: One State over Time
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
  chartType: area
  data: data.csv
  title: Gross Collections in {state} by Type of Tax, FY1998-2025
  subtitle: '{dollars}. Billions.'
  source: IRS Data Book, Table 1-5; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  note: 'Real dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026),
    fiscal-year average, FY2025 dollars.'
  xAxisType: numeric
  value_prefix: $
  value_suffix: B
  series_order:
    - Income tax withheld and FICA
    - Income tax not withheld and SECA
    - Business income taxes
    - Estate, gift, excise and other
    - In the printed total, not in its parts
  series_colors:
    Income tax withheld and FICA: '#0072B2'
    Income tax not withheld and SECA: '#E69F00'
    Business income taxes: '#B8302C'
    Estate, gift, excise and other: '#8856BF'
    In the printed total, not in its parts: '#9A9A9A'
---

The state's gross collections by type. The stack reaches the state's printed total. The grey band is what the total holds that no part shows: a suppressed or combined cell, or a misprint (Arkansas FY2011).
