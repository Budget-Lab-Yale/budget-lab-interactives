---
short_label: Revenue by Year
selectors:
- id: series
  label: Estimate
  kind: single
  default: conventional
  options:
  - {id: conventional, label: Conventional}
  - {id: dynamic, label: Dynamic}
parts:
- figureType: table
  scenario_role: stub
  spec:
    data: data.csv
    title: Net Revenue Impact by Fiscal Year
    subtitle: Billions of dollars, by scenario.
    source: GTAP v7 [Corong et al. (2017)], GTAP-RD, The Budget Lab analysis.
    notes: "Net of the offsetting reduction in income and payroll tax revenue."
    stub: [scenario]
    header: [category]
    value: value
    column_order: ["2026","2027","2028","2029","2030","2031","2032","2033","2034","2035","Total"]
    column_labels:
      Total: 10-yr total
    format:
      default: {type: number, decimals: 1, thousands: true, prefix: "$"}
- figureType: chart
  scenario_role: series
  total: {column: category, value: Total, hide: true}
  spec:
    chartType: bar
    data: data.csv
    title: Net Revenue Impact by Fiscal Year
    subtitle: Billions of dollars, by scenario.
    orientation: vertical
    xAxisType: categorical
    columns:
      x: category
      series: scenario
      value: value
    x_order: ["2026","2027","2028","2029","2030","2031","2032","2033","2034","2035"]
---

The net federal revenue impact of the tariffs by fiscal year, compared across scenarios. The table gives the
annual figures and the 10-year total. The chart shows the year-by-year path. Use the sidebar to
switch between conventional and dynamic, and the **View** toggle for levels or change vs. default.
