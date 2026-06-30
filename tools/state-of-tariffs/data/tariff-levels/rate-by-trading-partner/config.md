---
short_label: Rate by Trading Partner
figureType: chart
spec:
  chartType: line
  data: data.csv
  title: U.S. Tariff Rate on Imports from {partner}
  subtitle: Percent. Illustrative placeholder data.
  source: Placeholder data. The Budget Lab.
  xAxisType: quarterly
  yAxisPolicy:
    min: 0
    tickCount: 5
selectors:
- id: partner
  label: Trading partner
  kind: single
  default: china
  options:
  - id: china
    label: China
  - id: eu
    label: European Union
  - id: mexico
    label: Mexico
---

Average U.S. tariff rate applied to imports from a selected trading partner. Use the **Trading partner** selector to switch the series shown. This is placeholder text describing the figure.
