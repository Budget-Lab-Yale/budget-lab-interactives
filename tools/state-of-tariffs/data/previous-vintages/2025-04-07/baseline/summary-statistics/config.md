---
figureType: table
spec:
  title: "Summary of Results"
  subtitle: "Projected effects of tariff policy as of April 8, 2025 (through the week of April 7)."
  source: "Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis."
  stub:
    - "category"
    - "series"
  header: []
  value: "value"
  group_labels:
    Tariff rate: "Tariff rates, as of April 8, 2025"
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
  originalFigureId: "summary-statistics"
  vintageDate: "2025-04-08"
  scenarioTab: "default-scenario"
---

**Summary of Results**

Projected effects of tariff policy as of April 8, 2025 (through the week of April 7).

_Notes: Corrects this vintage's figures using the source "State of U.S. Tariffs" workbook through April 9, 2025, which supersedes the previously entered conventional revenue total. Also adds a "Dynamic" revenue row (Table 1) alongside Conventional, computed as Conventional plus the workbook's additional dynamic revenue effect, and adds a "Conventional, % of GDP" row and a "Change in payroll employment, 2025 Q4 (thousands)" row, both present in the original release but missing from the initial restructuring of this vintage._

_Source: Congressional Budget Office, S&P Global, GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis._
