# State of Tariffs — changelog

Entries are added at release.

## Unreleased

- Rebuilt around the Tariff-Model dashboard data interface. Five tabs: Introduction, Daily
  Statutory Rates, Default Scenario, Alternative Scenarios, Methodology.
- New `scripts/sync-model-data.py` copies a published model vintage into `data/` and writes
  `data/model-meta.json` (scenarios + provenance).
- `scripts/build-manifest.py` gains model-driven augmentation: `auto_format: units`
  (unit→number-format + row labels), `project_band` (shade `projected==1` runs),
  `scenario_role: series|header|stub|selector` (inject scenario order/labels/dropdown from
  model-meta), and stamps the release date/vintage from the model run.
- `render.js` gains `total` handling (toggle an aggregate row in/out; promote it to its own
  series for a distinct color) and applies tab-toggle column filters (e.g. a sticky
  level/change `measure` toggle).
- `render.js` now treats `series_order` as a whitelist: only the named series are drawn. Fixes
  By Product silently plotting all 22 product groups over daily data (a main-thread freeze) when
  only 7 are "selected," and makes the "Without China" toggle actually drop China's line.
- GDP by trading partner: dropped the redundant "World ex USA" aggregate (it double-counts the
  mutually-exclusive partner groups); done durably in `reconcile-model-data.py`. Relabeled the
  Sector/Country selector and pane to "trading partner" throughout.
- Daily Statutory Rates: removed the Geneva-truce marker, renamed the Feb 2025 marker to "Early
  fentanyl tariffs," and anchored the projection band's start to the build date (`today` keyword
  in `events.yaml`, resolved by `build-manifest.py`).
- Placeholders remain for the modelers: Tab 2 policy-change markers, an aggregate PCE-total
  bar, and an all-household decile total; Introduction and Methodology copy are drafts (TK).

