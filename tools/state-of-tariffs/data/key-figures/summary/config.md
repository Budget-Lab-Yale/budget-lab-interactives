---
short_label: Summary
figureType: prose
tables:
  rate:
    spec:
      title: Effective Tariff Rate, End of 2026
      data: rate.csv
      stub: [measure]
      header: [scenario]
      value: value
      column_order: [Section 122 Expires, Section 122 Extended]
      format:
        default: { type: percent, decimals: 1 }
  headline:
    spec:
      title: Headline Long-Run Effects
      data: headline.csv
      stub: [metric]
      header: [scenario]
      value: value
      column_order: [Section 122 Expires, Section 122 Extended]
      format:
        default: { type: percent, decimals: 2 }
---

This is a placeholder summary pane demonstrating the prose layout: an arbitrary number of text cards — one per `##` heading — with table cards placed inline via a `{{table: id}}` directive, so a table can sit before, between, or after any text card. Replace this with the real narrative.

{{table: rate}}

## Key Takeaways

Placeholder narrative. Tariffs raise consumer price levels and modestly lower long-run real GDP, with larger effects if the Section 122 tariffs are extended rather than allowed to expire.

{{table: headline}}

## Notes

Placeholder notes card, appearing after the second table. All values shown here are illustrative and not Budget Lab estimates.
