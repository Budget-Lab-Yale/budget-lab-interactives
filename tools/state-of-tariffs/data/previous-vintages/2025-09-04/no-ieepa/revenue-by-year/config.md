---
figureType: table
spec:
  data: "data.csv"
  title: "Net Revenue Impact by Fiscal Year"
  subtitle: "Billions of dollars."
  source: "Congressional Budget Office, GTAP v7 [Corong et al (2017)], The Budget Lab analysis."
  notes: "Estimates are net of the offsetting reduction in income and payroll tax revenue."
  stub:
    - "series"
  header:
    - "category"
  value: "value"
  row_labels:
    conventional: "Conventional"
    dynamic: "Dynamic"
    difference: "Difference (Dynamic − Conventional)"
  column_order:
    - "2025"
    - "2026"
    - "2027"
    - "2028"
    - "2029"
    - "2030"
    - "2031"
    - "2032"
    - "2033"
    - "2034"
    - "2035"
    - "2026-35"
    - "2025-34"
  format:
    default:
      type: number
      decimals: 1
      thousands: true
      prefix: "$"
  header_labels:
    "2026-35": "2026-35 Total"
    "2025-34": "2025-34 Total"
  originalFigureId: "revenue-by-year"
  vintageDate: "2025-09-04"
  scenarioTab: "no-ieepa"
---

**Net Revenue Impact by Fiscal Year**

Billions of dollars. Shown under the No-IEEPA scenario, which models the counterfactual removal of IEEPA-based tariffs.

_Notes: Published in the original release as Table 3 (Table 6 under No-IEEPA), giving Conventional, Dynamic, and the Dynamic effect (relabeled "Difference (Dynamic − Conventional)") by fiscal year, plus 10-year (2026-35) and 11-year (2025-34) totals. The source workbook's fiscal-year-2025 Dynamic-effect row label was corrupted to \"All Non-IEEPA 2025 Tariffs to Date\" in an earlier column context; the Table 6 data used here reads cleanly by column position (year headers in row 5, Conventional/Dynamic/Dynamic-effect in rows 6-8) and required no correction. Estimates are net of the offsetting reduction in income and payroll tax revenue._

_Source: Congressional Budget Office, GTAP v7 [Corong et al (2017)], The Budget Lab analysis._
