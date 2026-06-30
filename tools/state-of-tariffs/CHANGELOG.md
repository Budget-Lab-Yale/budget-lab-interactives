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
