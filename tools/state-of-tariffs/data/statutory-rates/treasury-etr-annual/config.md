---
short_label: Annual
figureType: chart
spec:
  chartType: line
  data: data.csv
  title: Average Effective Tariff Rate, Annual
  subtitle: Customs duties as a percent of goods imports. Percent.
  value_suffix: "%"
  source: Douglas A. Irwin, "Merchandise imports and duties, 1790–2000," Table Ee424-430 in
    Historical Statistics of the United States, Earliest Times to the Present, Millennial Edition,
    ed. Susan B. Carter et al. (Cambridge University Press, 2006), hsus.cambridge.org; Monthly
    Treasury Statement; Bureau of Economic Analysis, NIPA Table 4.1; The Budget Lab analysis.
  note: Through 1981, duties calculated as a percent of imports for consumption (HSUS series
    Ee429). From 1982, calendar-year net customs receipts as a percent of goods imports (NIPA
    Table 4.1). The dashed line continues the HSUS series through 2000 to show the difference
    between the two measures. 1790–1821 use total imports and duties collected and are not
    directly comparable to later years. Years end September 30 through 1842 and June 30 from
    1843 to 1915.
  xAxisType: numeric
  series_order:
  - effective_rate
  - hsus_overlap
  series_labels:
    effective_rate: Effective tariff rate
    hsus_overlap: "HSUS measure (duties calculated), 1982–2000"
  series_colors:
    effective_rate: blue
    hsus_overlap: blue
  series_styles:
    hsus_overlap:
      dashed: true
---

Customs duties as a share of the value of goods imports, from 1790 to the most recent full year.
Use the starting-year toggle to change the period shown. The series joins two sources in 1982:
the [*Historical Statistics of the United States*](https://hsus.cambridge.org/HSUSWeb/toc/hsusHome.do.html)
ratio of duties calculated to imports, and
Treasury's customs receipts divided by the Bureau of Economic Analysis's goods imports. The
two measures differ by up to a quarter of a percentage point where they overlap. Each starting
year's note explains what changes in the data before that point.
