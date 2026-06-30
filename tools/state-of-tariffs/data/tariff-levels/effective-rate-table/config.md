---
short_label: Effective Rate Table
figureType: table
spec:
  title: Effective Tariff Rates by Scenario
  data: data.csv
  subtitle: Illustrative placeholder data.
  source: Placeholder data. The Budget Lab.
  stub:
  - group
  - label: measure
  header:
  - scenario
  value: value
  column_order: [Pre-2025, Current, Announced]
  row_labels:
    statutory: 'Average statutory rate (\(\tau\))'
    effective: 'Effective rate (\(\tau_{eff}\))'
    passthrough: 'Import-price passthrough (\(\rho\))'
  group_labels:
    rates: 'Tariff rates'
    transmission: 'Price transmission'
  format:
    default: { type: percent, decimals: 1 }
---

Statutory and effective tariff rates and the implied import-price passthrough under three scenarios. The row labels use inline math (rendered by the chart engine) to demonstrate the v1.1.1 table feature. All values are illustrative placeholders.
