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
  chartType: stacked
  data: data.csv
  title: Amount of Refunds in {state} by Type, FY1995-2025
  subtitle: '{dollars}. Billions. Hatched: stimulus and advance payments.'
  source: IRS Data Book, Table 1-8; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  note: 'Real dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026),
    fiscal-year average, FY2025 dollars.'
  xAxisType: categorical
  orientation: vertical
  barStack:
    netDisplay: none
  series_order:
    - Individual income tax
    - Stimulus and advance payments
    - Employment taxes
    - Business income taxes
    - Excise, estate, gift and other
    - In the printed total, not in its parts
  series_colors:
    Business income taxes: '#B8302C'
    Employment taxes: '#E69F00'
    Excise, estate, gift and other: '#8856BF'
    Individual income tax: '#0072B2'
    Stimulus and advance payments: '#0072B2'
    In the printed total, not in its parts: '#9A9A9A'
  series_patterns:
    Stimulus and advance payments: /
  value_prefix: $
  value_suffix: B
---

Refunds for the state you pick, each year by type. The hatched segment is the stimulus and advance payments the IRS prints in their own columns. The grey band is what the printed total holds that no part shows: a suppressed cell, or a misprint. FY1995-97 are districts: a state has a bar only where its district was the whole state or the book printed a memo total for it.
