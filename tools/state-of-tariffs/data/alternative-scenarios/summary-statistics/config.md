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

These figures show the same projected effects as the Default Scenario tab, but across both current
law and several modeled policy scenarios. Use the **View** toggle to switch between each scenario's
own effects (levels) and its effect relative to our default scenario (change vs. default).

We include three alternative scenarios in this release:

- **Excluding the Section 338 tariffs.** This scenario is identical to current law except that it
  omits the Section 338 tariff actions on Canadian products, which took effect on August 22.
- **Excluding the Section 301 tariff actions taken since January 2025.** This scenario is
  identical to current law except that it omits the Section 301 tariff actions on Brazil and the
  forced-labor tariffs. It keeps in place the Section 301 tariffs on China imposed before 2025.
- **Excluding the Section 232 tariffs.** This scenario is identical to current law except that it
  omits all Section 232 tariffs on steel, aluminum, and other products.
