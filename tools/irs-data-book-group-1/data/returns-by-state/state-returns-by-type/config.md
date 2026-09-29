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
  chartType: line
  data: data.csv
  title: Returns Filed in {state}, FY1998-2025
  subtitle: By type of return. Each panel's unit is in its title.
  source: IRS Data Book, Table 1-3; Census Bureau population estimates (FRED); The
    Budget Lab analysis.
  xAxisType: numeric
  columns:
    facet: series
  small_multiples:
    mode: per-pane
    columns: 4.0
  legend: no
  series_colors:
    All returns, millions: '#0072B2'
    Individual income tax, millions: '#0072B2'
    Individual estimated tax, thousands: '#0072B2'
    Employment tax, thousands: '#0072B2'
    Supplemental documents, thousands: '#0072B2'
    Partnership, thousands: '#0072B2'
    S corporation, thousands: '#0072B2'
    C corporation, thousands: '#0072B2'
    Corporation (to FY2003), thousands: '#0072B2'
    Estate and trust, thousands: '#0072B2'
    Estate and trust estimated tax, thousands: '#0072B2'
    Tax-exempt organizations, thousands: '#0072B2'
    Excise tax, thousands: '#0072B2'
    Gift tax, thousands: '#0072B2'
    Estate tax, thousands: '#0072B2'
    Employee plans (to FY2002), thousands: '#0072B2'
    All returns, thousands: '#0072B2'
    Individual income tax, thousands: '#0072B2'
    Individual estimated tax, millions: '#0072B2'
    Employment tax, millions: '#0072B2'
    Supplemental documents, millions: '#0072B2'
    Partnership, millions: '#0072B2'
    S corporation, millions: '#0072B2'
    C corporation, millions: '#0072B2'
    Corporation (to FY2003), millions: '#0072B2'
    Estate and trust, millions: '#0072B2'
    Estate and trust estimated tax, millions: '#0072B2'
    Tax-exempt organizations, millions: '#0072B2'
    Excise tax, millions: '#0072B2'
    Employee plans (to FY2002), millions: '#0072B2'
---

Every type of return for the state you pick, each on its own scale. Seven states start in FY1998, when their IRS district was the whole state; the others start in FY2000, when the book begins to report by state.
