---
short_label: Refunds by Type of Tax
variants:
  - id: nominal
    spec:
      annotations:
        points:
          - x: '2001'
            'y': 482.2817253
            label: '↙ FY2001: advance refunds, $35.5B'
            dx: 10.0
            dy: 0.0
          - x: '2008'
            'y': 352.278202
            label: 'FY2008-09: stimulus, $95.7B and $11.5B →'
            dx: -12.0
            dy: 0.0
          - x: '2020'
            'y': 599.654793
            label: 'FY2020: economic impact payments, $273.0B →'
            dx: -12.0
            dy: 0.0
          - x: '2021'
            'y': 844.971285
            label: 'FY2021-22: EIPs and advance CTC, $585.7B and $50.9B →'
            dx: -12.0
            dy: 0.0
      note: 'Hatched segments, stimulus and advance payments: FY2001 $35.5B, FY2008
        $95.7B, FY2009 $11.5B, FY2020 $273.0B, FY2021 $585.7B, FY2022 $50.9B. FY2015
        excise refunds are printed as $7.4 billion; the book''s own net collections
        imply $0.7 billion, an IRS misprint drawn as printed. '
  - id: real
    spec:
      annotations:
        points:
          - x: '2001'
            'y': 833.7842722
            label: '↙ FY2001: advance refunds, $61.4B'
            dx: 10.0
            dy: 0.0
          - x: '2008'
            'y': 514.3817642
            label: 'FY2008-09: stimulus, $139.7B and $16.6B →'
            dx: -12.0
            dy: 0.0
          - x: '2020'
            'y': 731.0495596
            label: 'FY2020: economic impact payments, $332.8B →'
            dx: -12.0
            dy: 0.0
          - x: '2021'
            'y': 996.2374775
            label: 'FY2021-22: EIPs and advance CTC, $690.6B and $56.0B →'
            dx: -12.0
            dy: 0.0
      note: 'Hatched segments, stimulus and advance payments: FY2001 $61.4B, FY2008
        $139.7B, FY2009 $16.6B, FY2020 $332.8B, FY2021 $690.6B, FY2022 $56.0B (FY2025
        dollars). FY2015 excise refunds are printed as $7.4 billion; the book''s own
        net collections imply $0.7 billion, an IRS misprint drawn as printed. Real
        dollars: GDP price index (FRED GDPDEF, retrieved September 29, 2026), fiscal-year
        average, FY2025 dollars.'
  - id: share
    spec:
      annotations:
        points: []
      note: 'Hatched segments, stimulus and advance payments: FY2001 14.0%, FY2008
        22.3%, FY2009 2.6%, FY2020 37.1%, FY2021 51.5%, FY2022 7.9% of that year''s
        refunds. FY2015 excise refunds are printed as $7.4 billion; the book''s own
        net collections imply $0.7 billion, an IRS misprint drawn as printed. '
spec:
  chartType: stacked
  data: data.csv
  title: Refunds by Type of Tax, FY1995-2025
  subtitle: '{dollars}. Hatched: stimulus and advance payments, part of individual
    refunds.'
  source: IRS Data Book, Table 1-1; The Budget Lab analysis.
  xAxisType: categorical
  orientation: vertical
  barStack:
    netDisplay: none
  series_order:
    - Individual income taxes
    - Employment taxes
    - Business income taxes
    - Excise taxes
    - Estate and gift taxes
    - Stimulus and advance payments
  series_colors:
    Individual income taxes: '#0072B2'
    Employment taxes: '#E69F00'
    Business income taxes: '#B8302C'
    Excise taxes: '#8856BF'
    Estate and gift taxes: '#2A8B3A'
    Stimulus and advance payments: '#0072B2'
  series_patterns:
    Stimulus and advance payments: /
  value_prefix: $
  value_suffix: B
---

Refunds issued each fiscal year. The hatched segment on top of each bar is the part of
individual refunds that this table's notes name as stimulus or advance payments. The IRS
states them in nominal dollars:

- FY2001: $35.51 billion (FY2001 Data Book, note 1).
- FY2008: $95.7 billion (FY2008 Data Book, note 4).
- FY2009: $11.5 billion (FY2009 Data Book, note 6).
- FY2020: $273 billion (FY2020 Data Book, note 5).
- FY2021: $585.7 billion (FY2021 Data Book, note 5).
- FY2022: $50.9 billion (FY2022 Data Book, note 5).
