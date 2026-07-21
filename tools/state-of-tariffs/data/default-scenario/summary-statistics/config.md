---
short_label: Summary of Results
figureType: table
lead: true
auto_format: units
spec:
  title: Summary of Results
  subtitle: Projected effects of our default tariff policy scenario.
  data: data.csv
  stub:
  - category
  - series
  header: []
  value: value
  source: GTAP v7 [Corong et al. (2017)], GTAP-RD, The Budget Lab analysis.
  notes: "Pre-substitution numbers reflect tariff policy applied to 2024 trade weights and account for noncompliance only; post-substitution numbers account for both noncompliance and tariff-induced shifts in trade weights."
  group_labels:
    Tariff rate: Tariff rates, end of 2026
    Consumer price increase: Consumer price increase, medium run
    Household cost: Average household cost, medium run
  # Explicit per-group formats override auto_format: units (which fills groups via setdefault,
  # so these declared ones win). Revenue to whole $B; consumer price to two decimals.
  format:
    groups:
      Revenue (10-year): {type: currency, decimals: 0, prefix: "$", suffix: B, thousands: true}
      Consumer price increase: {type: number, decimals: 2, suffix: "%"}
---

## Default Scenario

This section presents projected effects under our default tariff policy scenario. Under this
scenario, Section 122 tariffs expire as scheduled at the end of July and are not replaced, and
scheduled changes to pharmaceutical tariffs are assumed to take effect in October. This scenario
can be thought of as a "current law" concept, where official policy, including changes that are
officially scheduled to come into effect later this year, is taken as given. The default scenario
also incorporates two recently proclaimed actions: the 25% tariff on imports from Brazil and the
new Section 338 tariffs on imports from Canada. The Canada tariffs are scheduled to take effect
August 19, 2026; consistent with the current-law convention above, they are included here even
though they are not yet in effect.

This is not a forecast of where tariff policy will end up but rather a useful scorekeeping
benchmark. Alternative policy scenarios are explored in the next tab.

Estimated impacts are measured against a January 2025 tariff-policy baseline. That is, these
numbers answer the question: going forward, what will the impacts of tariffs be _relative to a
world where the Trump administration never changed tariff policy_?
