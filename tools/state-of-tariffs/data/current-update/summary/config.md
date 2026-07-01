---
short_label: Summary
figureType: prose
tables:
  policy:
    spec:
      title: Current Tariff Policy as of April 8, 2026
      data: policy.csv
      stub:
      - group
      - label: item
      header:
      - col
      value: value
      group_labels:
        s122: Broad Tariffs under Section 122 Authority
        s232: Product-Specific Tariffs under Section 232 Authority
      header_labels:
        detail: " "
      stub_header: " "
      column_width: 360
      notes: Section 232 tariffs are assumed to preempt Section 122 for all countries where they overlap.
      source: White House proclamations and executive orders; USITC HTS. The Budget Lab analysis.
  effects:
    spec:
      title: Summary Economic & Fiscal Effects of Trump Administration Tariffs
      data: effects.csv
      stub:
      - group
      - label: metric
      header:
      - scenario
      value: value
      column_order: [Section 122 Expires, Section 122 Extended]
      group_labels:
        eff: Effective Tariff Rates at the End of 2026
        fiscal: Fiscal
        prices: Prices in the Medium Run
        output: Output and Employment
      format:
        default: { type: number, decimals: 1 }
        groups:
          eff: { type: number, decimals: 1, suffix: "%" }
          fiscal: { type: currency, decimals: 2, prefix: "$" }
        rows:
          "Percent Change in PCE Price Level, pre-substitution": { type: number, decimals: 1, suffix: "%" }
          "Percent Change in PCE Price Level, post-substitution": { type: number, decimals: 1, suffix: "%" }
          "Average Household Real Income Loss, Pre-Substitution (2025$)": { type: currency, decimals: 0, prefix: "$", thousands: true }
          "Average Household Real Income Loss, Post-Substitution (2025$)": { type: currency, decimals: 0, prefix: "$", thousands: true }
          "Percent change in Q4 2026 GDP": { type: number, decimals: 2, suffix: "%" }
          "Percent change in long-run GDP": { type: number, decimals: 2, suffix: "%" }
          "Percentage Point Change in the Unemployment Rate, End of 2026": { type: number, decimals: 2 }
      source: GTAP v7 [Corong et al (2017)], GTAP-RD, The Budget Lab analysis.
---


## Current Update

{date: updated}

This report reflects several changes, the code behind which is available to view in our public GitHub repository, since our update published the morning of April 2. The first two are policy changes announced later on April 2:

- Changes to metal tariffs. Prior to this announcement, Section 232 tariffs on metals were structured as a single-rate system where imports were subject to a 50% tariff on the respective metal content of steel, aluminum, and copper products. The new policy creates a multi-rate system based on metal content (where certain country-specific rates apply), effective April 6, 2026:
    - High-metal content products face a 50% rate.
    - Most derivative products face a 25% rate (on the full import value, not just the metal content value).
    - Other derivative products face a minimum 15% overall tariff rate.
    - Products with less than 15% metal content by weight are exempt (though may be subject to other tariffs).
- New pharmaceutical tariffs. This announcement introduces a new 100% Section 232 tariff on most patented pharmaceuticals and related products. Generic drugs and “orphan” drugs are exempt, and certain countries face lower rates based on trade deals. Products from companies who make certain onshoring agreements with the administration are eligible for a lower rate; if those companies also enter pricing agreements, their products are exempt entirely. Seventeen drug manufacturers are named explicitly in the announcement as having pre-existing onshoring agreements. This regime goes into effect on September 29, 2026.

Both regimes include scheduled future changes that we do not model. (The metal tariff’s 15% floor is temporary, expiring December 31, 2027; elements of the company-specific preferential treatment framework for the pharmaceutical tariffs expire in 2029 and 2030.) Because we use a “current policy” modeling framework, where we evaluate the effects of policy as enacted through a near-term horizon, these longer-term scheduled changes are not reflected in our estimates.

Since the last report, we also made several minor changes to our effective tariff rate model which affected the estimated overall average effective tariff rate by less than 0.1 percentage point.

{{table: policy}}

{{table: effects}}
