# State of Tariffs — changelog

## Unreleased

- Initial scaffold. Modeled on the AI Labor Market Tracker (tabs, left nav sidebar, right figure
  cards), but figures render through the **vendored Budget Lab chart engine v1.1.1**
  (`vendor/chart-engine/`) via `window.BudgetLabChart.mountChart` / `mountTable`, rather than a
  bespoke renderer.
- Manifest pipeline (`scripts/build-manifest.py`): `tracker.yaml` + per-figure `config.md`
  (engine ChartSpec/TableSpec frontmatter + markdown body) + `data.csv` → `data/manifest.json`.
- Features: deep-link URL state (tab / figure / toggles+selectors), chart and table figures
  (incl. inline math), tab-level variant toggles, and figure-level sidebar selectors.
- Content is placeholder only — illustrative numbers, not Budget Lab estimates.

## Unreleased — real figures (State of U.S. Tariffs, April 8, 2026)

- Replaced placeholder content with figures from the April 8, 2026 analysis, in a single
  "Key Figures" tab with three sidebar sections (Tariff Rates / Economic Effects /
  Households & Prices). Data converted from the source workbook to tidy CSVs.
- F1 Effective tariff rate since 1790 — line; the two constant "Current rate" series were
  converted to horizontal yAxis annotation lines; numeric x-axis with `anchorAtZero: false`.
- F2 Daily effective tariff rate (single line); F3 Real GDP level effects (two scenario lines);
  F4 Long-run GDP by sector and F5 by region (diverging horizontal grouped bars);
  F6 Distributional effects by decile (small-multiples faceted by measure: % of ATI / 2025$).
- F7 Consumer price effects by PCE category is **held**: it needs faceted *horizontal* bars,
  which the engine does not yet support. Its CSV + spec are committed but it is commented out
  of `tracker.yaml`; re-enable once the engine gains horizontal small-multiples.
- New `figureType: prose` — a text-only (unnumbered) nav pane that renders an ordered sequence
  of text cards (one per `##` heading) and table cards placed inline with a `{{table: id}}`
  directive (tables can appear before/between/after text). Added a placeholder "Summary" pane.
- F1 annotation labels moved to the left, inset, with post-substitution below its line; F4/F5
  switched to vertical bars; F4 split into "Sectors" + "Manufacturing detail" facet panes;
  F5 value labels turned off.

## Unreleased — Tariff Rate Tracker tab

- New "Tariff Rate Tracker" tab (data from the Budget Lab Tariff Rate Tracker blog, May 2026):
  daily effective rate (line), ETR by authority (stacked area), China vs. other countries,
  ETR by trading partner, and ETR by commodity (lines). Sections: Overall Rate / By Trading
  Partner / By Commodity.
- New build feature: a figure can set `events: <name>` (or a list) to pull shared annotations
  from the tab-level `events.yaml` into `spec.annotations`. A group is a flat list (xAxis
  reference lines) or a mapping with `xAxis`/`bands`; xAxis lines are auto-filtered to the
  figure's date range, bands pass through. Used for the major policy events, the red Section 122
  expiry line (2026-07-23), and the "assumes no further policy changes" projection band (from the
  2026-05-09 as-of date) on every tracker figure.
- y-axis maxes: daily rate & by-authority 25%, China-vs-other 120%, by-partner 20% (by-commodity
  auto), to leave headroom for the event labels.
- Fixed a generation bug that truncated the China/partner/commodity CSVs at 1000 rows; they now
  carry the full daily series through 2026-12-31.
