---
short_label: Summary of Results
figureType: table
lead: true
auto_format: units
scenario_role: header
spec:
  title: Summary of Results by Scenario
  subtitle: Projected effects across policy scenarios.
  data: data.csv
  stub:
  - category
  - series
  header:
  - measure
  - scenario
  value: value
  header_labels:
    level: Levels
    delta_vs_default: Change vs. default
  source: GTAP v7 [Corong et al. (2017)], GTAP-RD, The Budget Lab analysis.
  notes: "Pre-substitution numbers reflect tariff policy applied to 2024 trade weights and account for noncompliance only; post-substitution numbers account for both noncompliance and tariff-induced shifts in trade weights."
  group_labels:
    Tariff rate: Tariff rates, end of 2026
    Consumer price increase: Consumer price increase, medium run
    Household cost: Average household cost, medium run
---

## Alternative Scenarios

These figures show the same projected effects as the Default Scenario tab, but across **all**
modeled policy scenarios. Use the **View** toggle to switch between each scenario's own effects
(levels) and its effect relative to our default scenario (change vs. default).

Each alternative is a variation on current law (which now includes the Brazil and Canada tariffs
described in the Introduction). We show the following two alternative scenarios:

- **Current Law ex-S338.** This scenario is identical to current law except that it omits the
  newly proclaimed Section 338 tariffs on imports from Canada. Comparing the default scenario
  against it isolates the projected effect of those tariffs.
- **New S301.** This scenario takes everything in current law and adds a further action on top:
  Section 122 expires as scheduled at the end of July and is replaced with new Section 301 tariffs
  based on the U.S. Trade Representative's June
  ["forced labor" investigation announcement](https://ustr.gov/about/policy-offices/press-office/press-releases/2026/june/ustr-makes-findings-and-proposes-action-60-section-301-investigations-relating-failures-take-action).
  The proposed tariffs cover most imports from 60 economies. The rate is 10% for countries that
  have taken steps to block imports made with forced labor and 12.5% for the others. We model the
  country rates and product list announced by USTR.