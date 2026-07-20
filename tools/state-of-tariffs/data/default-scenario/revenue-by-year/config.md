---
short_label: Revenue by Year
parts:
- figureType: table
  spec:
    data: data.csv
    title: Net Revenue Impact by Fiscal Year
    subtitle: Billions of dollars.
    source: GTAP v7 [Corong et al. (2017)], GTAP-RD, The Budget Lab analysis.
    notes: "Estimates are net of the offsetting reduction in income and payroll tax revenue and IEEPA tariff refunds."
    stub: [series]
    header: [category]
    value: value
    row_labels:
      conventional: Conventional
      dynamic: Dynamic
    column_order: ["2026","2027","2028","2029","2030","2031","2032","2033","2034","2035","Total"]
    column_labels:
      Total: 10-yr total
    format:
      default: {type: number, decimals: 1, thousands: true, prefix: "$"}
- figureType: chart
  total: {column: category, value: Total, hide: true}
  spec:
    chartType: bar
    data: data.csv
    title: Net Revenue Impact by Fiscal Year
    subtitle: Conventional and dynamic estimates. Billions of dollars.
    notes: "Estimates are net of the offsetting reduction in income and payroll tax revenue and IEEPA tariff refunds."
    orientation: vertical
    xAxisType: categorical
    columns:
      x: category
      series: series
      value: value
    x_order: ["2026","2027","2028","2029","2030","2031","2032","2033","2034","2035"]
    series_order:
    - conventional
    - dynamic
    series_labels:
      conventional: Conventional
      dynamic: Dynamic
---

The net federal revenue impact of the tariffs by fiscal year, on a conventional and a dynamic basis. The
table gives the annual figures and the 10-year total. The chart shows the year-by-year path.
