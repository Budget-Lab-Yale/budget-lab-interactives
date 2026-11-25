---
short_label: Monthly
figureType: chart
spec:
  chartType: line
  data: data.csv
  title: Effective Tariff Rate from Monthly Treasury Data
  subtitle: Customs duties as a percent of imports for consumption, by month. Percent.
  value_suffix: "%"
  source: Monthly Treasury Statement, Table 4; U.S. Census Bureau; The Budget Lab analysis.
  note: Gross customs receipts before refunds, divided by the same month's imports for
    consumption. Duties are generally paid about a month after goods enter, so monthly ratios
    blur timing. The Treasury series begins in March 2015.
  xAxisType: temporal
  yAxisPolicy:
    min: 0
    max: 14
    tickCount: 8
  series_order:
  - treasury_etr
  series_labels:
    treasury_etr: Effective tariff rate
  series_colors:
    treasury_etr: blue
---

Customs duties collected each month as a share of that month's goods imports. Use the toggles
to change the starting month and to switch between gross receipts and receipts net of refunds.
Net receipts fall below zero in May through July 2026, when refunds of tariffs imposed under
the International Emergency Economic Powers Act exceeded new collections.
