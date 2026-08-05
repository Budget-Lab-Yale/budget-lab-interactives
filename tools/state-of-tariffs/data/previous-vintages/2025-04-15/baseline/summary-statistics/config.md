---
figureType: table
spec:
  title: "Summary of Results"
  subtitle: "Projected effects of tariff policy as of April 15, 2025."
  source: "Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis."
  stub:
    - "category"
    - "series"
  header: []
  value: "value"
  group_labels:
    Tariff rate: "Tariff rates, as of April 15, 2025"
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
        suffix: " jobs"
      "Conventional, % of GDP":
        type: number
        decimals: 2
        suffix: "%"
        prefix: ""
        thousands: false
  originalFigureId: "summary-statistics"
  vintageDate: "2025-04-15"
  scenarioTab: "default-scenario"
---

**Summary of Results**

Projected effects of tariff policy as of April 15, 2025.

_Notes: Adds a "Change in payroll employment, 2025 Q4 (thousands)" row and a "Conventional, % of GDP" row (Table 1) to this vintage, both present in the original April 15, 2025 release but missing from the initial restructuring of this vintage. Also fixes a formatting bug where this row inherited the Revenue group's "$...B" currency prefix and thousands-separator, so it rendered as e.g. "$0.65%" instead of the plain percentage "0.65%"; the row-level override now explicitly clears both._

_Source: Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis._
