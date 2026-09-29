---
short_label: Returns by Type
variants:
  - id: levels
    spec:
      annotations:
        points:
          - x: '2002'
            series: Employee plans (to FY2002), millions
            facet: Employee plans (to FY2002), millions
            label: FY2002
            connector: yes
            dx: 0.0
            dy: 60.0
          - x: '2007'
            series: Individual income tax, millions
            facet: Individual income tax, millions
            label: FY2007
            connector: yes
            dx: -22.0
            dy: 26.0
          - x: '2008'
            series: Individual income tax, millions
            facet: Individual income tax, millions
            label: FY2008
            connector: yes
            dx: 0.0
            dy: 52.0
          - x: '2009'
            series: Tax-exempt organizations, millions
            facet: Tax-exempt organizations, millions
            label: FY2009
            connector: yes
            dx: 0.0
            dy: 30.0
          - x: '2011'
            series: Individual income tax, millions
            facet: Individual income tax, millions
            label: FY2011
            connector: yes
            dx: 22.0
            dy: 26.0
          - x: '2020'
            series: Individual income tax, millions
            facet: Individual income tax, millions
            label: FY2020
            connector: yes
            dx: 0.0
            dy: 44.0
          - x: '2022'
            series: Supplemental documents, millions
            facet: Supplemental documents, millions
            label: 'FY2022: e-filed 1040-X counted'
            connector: yes
            dx: -10.0
            dy: 28.0
      value_suffix: ''
      subtitle: Returns filed. Each panel's unit is in its title.
  - id: pct
    spec:
      annotations:
        points:
          - x: '2002'
            series: Employee plans (to FY2002)
            facet: Employee plans (to FY2002)
            label: FY2002
            connector: yes
            dx: 0.0
            dy: 60.0
          - x: '2007'
            series: Individual income tax
            facet: Individual income tax
            label: FY2007
            connector: yes
            dx: -22.0
            dy: 26.0
          - x: '2008'
            series: Individual income tax
            facet: Individual income tax
            label: FY2008
            connector: yes
            dx: 0.0
            dy: 52.0
          - x: '2009'
            series: Tax-exempt organizations
            facet: Tax-exempt organizations
            label: FY2009
            connector: yes
            dx: 0.0
            dy: 30.0
          - x: '2011'
            series: Individual income tax
            facet: Individual income tax
            label: FY2011
            connector: yes
            dx: 22.0
            dy: 26.0
          - x: '2020'
            series: Individual income tax
            facet: Individual income tax
            label: FY2020
            connector: yes
            dx: 0.0
            dy: 44.0
          - x: '2022'
            series: Supplemental documents
            facet: Supplemental documents
            label: 'FY2022: e-filed 1040-X counted'
            connector: yes
            dx: -10.0
            dy: 28.0
      value_suffix: '%'
      subtitle: Change from the prior year, as the IRS prints it. Percent.
spec:
  chartType: line
  data: data.csv
  title: Returns Filed by Type of Return, FY1994-2025
  source: IRS Data Book, Table 1-2; The Budget Lab analysis.
  xAxisType: numeric
  columns:
    facet: series
  small_multiples:
    mode: per-pane
    columns: 3.0
  legend: no
  series_colors:
    Individual income tax, millions: '#0072B2'
    Employment tax, millions: '#0072B2'
    Supplemental documents, millions: '#0072B2'
    Individual estimated tax, millions: '#0072B2'
    Estate and trust, millions: '#0072B2'
    Estate and trust estimated tax, millions: '#0072B2'
    Tax-exempt organizations, millions: '#0072B2'
    Excise tax, millions: '#0072B2'
    Gift tax, thousands: '#0072B2'
    Estate tax, thousands: '#0072B2'
    Employee plans (to FY2002), millions: '#0072B2'
    Individual income tax: '#0072B2'
    Employment tax: '#0072B2'
    Supplemental documents: '#0072B2'
    Individual estimated tax: '#0072B2'
    Estate and trust: '#0072B2'
    Estate and trust estimated tax: '#0072B2'
    Tax-exempt organizations: '#0072B2'
    Excise tax: '#0072B2'
    Gift tax: '#0072B2'
    Estate tax: '#0072B2'
---

One panel per type of return, each on its own scale: individual returns are counted in the
hundreds of millions, estate tax returns in the tens of thousands. The markers are changes the
IRS's own notes describe:

- FY2002: Form 5500 employee plan returns 
“which are now processed at the Department of Labor”
 (FY2002 book, note 1).
- FY2007: the one-time telephone excise refund: 
“Form 1040EZ-T (Federal telephone excise tax refund return)”
 (FY2007 book, note 2).
- FY2008: the 2008 stimulus payments 
“resulted in a temporary increase in the number of individual income tax returns filed in Fiscal Year 2008”
 (Table 1-4, FY2009 book, note 3).
- FY2009: tax-exempt returns count the Form 
“990-N (electronic notice [e-Postcard]”
 (FY2009 book, note 7).
- FY2011: forms that 
“have been excluded in the Fiscal Year 2011 edition”
 (FY2011 book).
- FY2020: 
“the IRS shut down Submission Processing units across the Service”
 (FY2020 book).
- FY2022: supplemental documents include the electronic Form 1040-X. No note of this table says so; the FY2022 notes of Tables 1-3 and 1-4 do (shared/config/definition_breaks.csv).
