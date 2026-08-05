---
figureType: table
spec:
  title: "Summary of Results"
  subtitle: "Projected effects of tariff policy as of October 17, 2025."
  source: "Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis."
  stub:
    - "category"
    - "series"
  header: []
  value: "value"
  group_labels:
    Tariff rate: "Tariff rates, as of October 17, 2025"
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
  vintageDate: "2025-10-17"
  scenarioTab: "default-scenario"
---

**Summary of Results**

Projected effects of tariff policy as of October 17, 2025.

_Notes: Adds a "Change in payroll employment, 2025 Q4 (thousands)" row and a "Conventional, % of GDP" row (Table 1) to this vintage, both present in the original release but missing from the initial restructuring of this vintage. The % of GDP row explicitly clears the Revenue group's currency prefix/thousands-separator so it renders as a plain percentage (e.g. "0.68%") rather than inheriting the group's "$...B" formatting -- a formatting bug found and fixed across all vintages carrying this row (2025-04-02, 2025-04-07, 2025-04-15, 2025-05-12) while adding it here._

_Source: Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis._
