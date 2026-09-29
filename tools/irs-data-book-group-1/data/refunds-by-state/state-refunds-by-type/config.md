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
  title: Refunds Issued in {state} by Type, FY1995-2025
  subtitle: 'Number of refunds; the unit is in each series'' name. Hatched: stimulus
    and advance payments.'
  source: IRS Data Book, Table 1-7; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  note: ~
  xAxisType: categorical
  orientation: vertical
  barStack:
    netDisplay: none
  series_order:
    - Individual income tax, millions
    - Individual income tax, thousands
    - Stimulus and advance payments, millions
    - Stimulus and advance payments, thousands
    - Employment taxes, millions
    - Employment taxes, thousands
    - Business income taxes, millions
    - Business income taxes, thousands
    - Excise, estate, gift and other, millions
    - Excise, estate, gift and other, thousands
    - In the printed total, not in its parts, millions
    - In the printed total, not in its parts, thousands
  series_colors:
    Business income taxes, millions: '#B8302C'
    Employment taxes, millions: '#E69F00'
    Excise, estate, gift and other, millions: '#8856BF'
    Individual income tax, millions: '#0072B2'
    Stimulus and advance payments, millions: '#0072B2'
    Business income taxes, thousands: '#B8302C'
    Employment taxes, thousands: '#E69F00'
    Excise, estate, gift and other, thousands: '#8856BF'
    Individual income tax, thousands: '#0072B2'
    Stimulus and advance payments, thousands: '#0072B2'
    In the printed total, not in its parts, millions: '#9A9A9A'
    In the printed total, not in its parts, thousands: '#9A9A9A'
  series_patterns:
    Stimulus and advance payments, millions: /
    Stimulus and advance payments, thousands: /
  value_suffix: ''
---

Refunds for the state you pick, each year by type. The hatched segment is the stimulus and advance payments the IRS prints in their own columns. The grey band is what the printed total holds that no part shows: a suppressed cell, or a misprint. FY1995-97 are districts: a state has a bar only where its district was the whole state or the book printed a memo total for it.
