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

Each alternative is a variation on current law, which now includes the Brazil, Canada, and
forced-labor Section 301 tariffs described in the Introduction. We show the following two
alternative scenarios:

- **Current law excluding new Section 301.** This scenario is identical to current law except that
  it omits the newly finalized forced-labor Section 301 tariffs; the Section 122 surcharge still
  ends at 12:01 a.m. on July 24 with nothing in its place. Comparing the default against it
  isolates the effect of the forced-labor action.
- **Section 122 regime.** Instead of letting the Section 122 tariffs expire and replacing them with
  the forced-labor Section 301 action, this scenario assumes the Section 122 10% tariff is extended
  and stays in force. Comparing it against the default contrasts the two blanket-tariff regimes:
  the expiring Section 122 regime and the Section 301 regime that actually took effect.
