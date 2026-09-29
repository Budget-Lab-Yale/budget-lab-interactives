---
short_label: Business Returns
spec:
  chartType: line
  data: data.csv
  title: Business Income Tax Returns Filed, FY1994-2025
  subtitle: Millions of returns.
  source: IRS Data Book, Table 1-2; The Budget Lab analysis.
  xAxisType: numeric
  value_suffix: M
  series_order:
    - Corporation (to FY2003)
    - C or other corporation
    - S corporation
    - Partnership
  series_colors:
    Corporation (to FY2003): '#8856BF'
    C or other corporation: '#0072B2'
    S corporation: '#E69F00'
    Partnership: '#B8302C'
  series_styles:
    Corporation (to FY2003):
      dashed: yes
  annotations:
    xAxis:
      - x: '2003'
        label: 'FY2003: C and S corporations printed apart'
        style: dashed
        color: grey
---

Corporation returns are one line through the FY2003 book, and C and S corporations after it; FY2003 prints both. S corporations grow from 3.33 million returns in FY2003 to 6.15 million in FY2025, while C corporations fall from 2.56 million to 2.35 million.
