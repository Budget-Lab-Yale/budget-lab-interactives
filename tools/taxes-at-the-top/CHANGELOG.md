# Revenue from higher taxes at the top — changelog

Tool-specific change history. Embed-loader and shared-asset changes are tracked in the [root CHANGELOG](../../CHANGELOG.md).

## 2026-10-08

- Initial release, migrated from the staging repo. Data: Tax-Simulator top-tax surrogate fit for run vintage `toptax_v11_2026-09-28`. Chart engine 1.12.0, vendored at `vendor/chart-engine/`.
- Launch snapshot frozen at [`versions/2026-10-08/`](versions/2026-10-08/).
- Same day, after launch: the stack chart's x-axis tick labels stretched when embedded in a narrow column, and on window resize. The chart is now drawn at its rendered width and redrawn when that width changes. Layout only, no change to any number. Applied to the `versions/2026-10-08/` snapshot as well, as a deliberate exception to the never-edit rule: it had been live for under an hour.
