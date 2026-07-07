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
- Placeholders remain for the modelers: Tab 2 policy-change markers, an aggregate PCE-total
  bar, and an all-household decile total; Introduction and Methodology copy are drafts (TK).

