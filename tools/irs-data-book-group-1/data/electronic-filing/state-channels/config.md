---
short_label: 'One State: How Returns Were E-filed'
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
  title: Individual Returns E-filed in {state}, by Channel, FY2000-2025
  subtitle: Number of returns; the unit is in each channel's name.
  source: IRS Data Book, Tables 1-3 and 1-4; Census Bureau population estimates (FRED);
    The Budget Lab analysis.
  xAxisType: numeric
  series_colors:
    By a practitioner, millions: '#0072B2'
    Self-prepared online, millions: '#E69F00'
    TeleFile (to FY2005), millions: '#B8302C'
    By a practitioner, thousands: '#0072B2'
    Self-prepared online, thousands: '#E69F00'
    TeleFile (to FY2005), thousands: '#B8302C'
  annotations:
    xAxis:
      - x: '2005'
        label: 'FY2005: TeleFile ends'
        style: dashed
        color: grey
        labelSide: right
      - x: '2009'
        label: 'FY2009: Free File counted'
        style: dashed
        color: grey
        labelSide: right
      - x: '2024'
        label: 'FY2024: Direct File, 12 states'
        style: dashed
        color: grey
        labelSide: left
---

Individual income tax returns e-filed in the state you pick. The three channels add up to the individual total. Free File and Direct File are part of self-prepared online.
