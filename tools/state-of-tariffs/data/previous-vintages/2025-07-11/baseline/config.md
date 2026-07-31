---
figureType: table
spec:
  title: "Summary of Results"
  subtitle: "Projected effects of tariff policy as of July 11, 2025."
  source: "Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis."
  stub:
    - "category"
    - "series"
  header: []
  value: "value"
  group_labels:
    Tariff rate: "Tariff rates, as of July 11, 2025"
    Consumer price increase: "Consumer price increase"
    Household cost: "Average household cost"
  format:
    groups:
      Revenue (10-year):
        type: currency
        decimals: 0
        prefix: "$"
        suffix: "B"
        thousands: true
      Consumer price increase:
        type: number
        decimals: 2
        suffix: "%"
      Tariff rate:
        type: number
        decimals: 1
        suffix: "%"
      Household cost:
        type: currency
        decimals: 0
        prefix: "$"
        thousands: true
      Real GDP:
        type: number
        decimals: 2
        suffix: " pp"
    rows:
      Long-run:
        type: number
        decimals: 2
        suffix: "%"
      Unemployment rate (p.p.), end of 2025:
        type: number
        decimals: 2
        suffix: " p.p."
      Change in payroll employment, 2025 Q4 (thousands):
        type: number
        decimals: 0
        suffix: "K jobs"
  originalFigureId: "summary-statistics"
  vintageDate: "2025-07-11"
  scenarioTab: "default-scenario"
---

**Summary of Results**

Projected effects of tariff policy as of July 11, 2025.

_Notes: Two corrections vs. the source workbook's face-value cells. (1) Adds a "Change in payroll employment, 2025 Q4 (thousands)" row (Table 1) to the Labor market group, which was published but missing from the initial restructuring of this vintage; uses a row-level format override since its unit differs from the group's other row. (2) The effective-tariff-rate levels use the recalculated totals (16.29% pre-substitution, 15.46% post-substitution) rather than the source workbook's stale Total row in Table 2/Figure 1 -- see the etr-by-country config note for detail._

_Source: Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis._
