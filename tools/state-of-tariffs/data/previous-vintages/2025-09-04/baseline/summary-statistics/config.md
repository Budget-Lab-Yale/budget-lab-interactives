---
figureType: table
spec:
  title: "Summary of Results"
  subtitle: "Projected effects of tariff policy as of September 3, 2025."
  source: "Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis."
  stub:
    - "category"
    - "series"
  header: []
  value: "value"
  group_labels:
    Tariff rate: "Tariff rates, as of September 3, 2025"
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
  vintageDate: "2025-09-04"
  scenarioTab: "default-scenario"
---

**Summary of Results**

Projected effects of tariff policy as of September 3, 2025.

_Notes: Built following the same conventions as the surrounding vintages -- Table 1/Table 4's "Conventional, % of GDP" and "Change in payroll employment" rows are included, with the % of GDP row's format explicitly clearing the Revenue group's currency prefix/thousands-separator so it renders as a plain percentage. Revenue (10-year) uses the precise Table 3/Table 6 totals (Conventional/Dynamic by fiscal year) rather than Table 1/Table 4's rounded face-value cells, consistent with how the revenue-by-year table for this vintage is built._

_Source: Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis._
