---
short_label: Individual Returns
variants:
  - id: levels
    spec:
      value_suffix: M
      subtitle: Millions of returns.
      annotations:
        points:
          - x: '2007'
            series: Individual income tax returns
            label: 'FY2007: telephone excise refund returns'
            connector: yes
            dx: -70.0
            dy: 40.0
          - x: '2008'
            series: Individual income tax returns
            label: 'FY2008: stimulus-only filers'
            connector: yes
            dx: 0.0
            dy: 30.0
          - x: '2011'
            series: Individual income tax returns
            label: 'FY2011: 1040EZ-T and others dropped'
            connector: yes
            dx: 60.0
            dy: 45.0
          - x: '2020'
            series: Individual income tax returns
            label: 'FY2020: COVID-19 processing shutdowns'
            connector: yes
            dx: -40.0
            dy: 30.0
  - id: pct
    spec:
      value_suffix: '%'
      subtitle: Change from the prior year, as the IRS prints it. Percent.
      annotations:
        points:
          - x: '2007'
            series: Individual income tax returns
            label: 'FY2007: telephone excise refund returns'
            connector: yes
            dx: -70.0
            dy: 40.0
          - x: '2008'
            series: Individual income tax returns
            label: 'FY2008: stimulus-only filers'
            connector: yes
            dx: 0.0
            dy: 30.0
          - x: '2011'
            series: Individual income tax returns
            label: 'FY2011: 1040EZ-T and others dropped'
            connector: yes
            dx: 60.0
            dy: 45.0
          - x: '2020'
            series: Individual income tax returns
            label: 'FY2020: COVID-19 processing shutdowns'
            connector: yes
            dx: -40.0
            dy: 30.0
spec:
  chartType: line
  data: data.csv
  title: Individual Income Tax Returns Filed, FY1994-2025
  source: IRS Data Book, Table 1-2; The Budget Lab analysis.
  xAxisType: numeric
  series_colors:
    Individual income tax returns: '#0072B2'
---

Individual income tax returns of every kind. The markers are the IRS's own notes, listed under Returns by Type.
