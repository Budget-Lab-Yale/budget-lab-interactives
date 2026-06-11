# Deficit Impact Calculator — Changelog

Tool-specific change history. Embed-loader and shared-asset changes are tracked in the [root CHANGELOG](../../CHANGELOG.md).

## 2026-06-11

- Added usage analytics. When embedded, the calculator emits structured `postMessage` events to the host page — `calculator_submission` on each Calculate click, and `explainer_opened` when the estimate explainer is opened — for the host's own tracking (e.g. GTM/GA4) to consume. Emits only when embedded; nothing is sent from the standalone page, and the payload carries only user-entered inputs (no computed results). See the [Analytics events](../../README.md#analytics-events) section of the root README for the event contract.
- No calculation, output, or layout changes, so no new snapshot was taken; the pre-analytics build remains at [`versions/2026-06-04/`](versions/2026-06-04/).

## 2026-06-04

- Mobile layout fix: the overlaid logo no longer collides with the "Enter your loan amount" heading on narrow viewports; the calculator now holds a 250px floor and scrolls below that instead of cramming. No calculation changes.
- Snapshot preserved at [`versions/2026-06-04/`](versions/2026-06-04/) (corrected build); previous build at [`versions/2026-05-11/`](versions/2026-05-11/).

## 2026-05-11

- Initial release.
- Calculator-only variant of [Deficits and Affordability](../deficits-affordability/), with the bar-chart sections removed. Same calculation methodology and inputs (CBO February 2026 baseline; elasticity 2.0 bp per pp debt/GDP; effective repricing speed K=0.0813).
- Snapshot preserved at [`versions/2026-05-11/`](versions/2026-05-11/) for citation pinning.
