# State of Tariffs — changelog

Entries are added at release.

## Unreleased

- **State of Tariffs: August 24, 2026 vintage.** Refreshed all figures to the published
  `2026082411` Tariff-Model artifact. The only policy change is the effective date of the Section
  338 tariffs on Canadian products, which took effect August 22 rather than August 19; projected
  effects are essentially unchanged (ten-year revenue moves by $0.04 billion). The alternative
  scenarios are reduced to one: current law excluding the Section 338 actions. `tracker.yaml`
  scenario colors re-pointed to the new scenario ids. August 11 release archived to
  previous-vintages.
- Table cells no longer print negative zero ("-0.0%") when a small negative value rounds to zero
  (local patch to the vendored chart engine's `formatCell`; needs to go upstream).

- **State of Tariffs: August 11, 2026 vintage.** Refreshed all figures to the published
  `2026081111` Tariff-Model artifact. The default scenario now includes the Section 232 polysilicon
  action — a 15% tariff on polysilicon and derivative solar cells and modules (the UK capped at
  10%), announced August 6 and effective December 4, 2026. It covers about $18 billion of imports,
  raises the overall statutory rate by 0.09pp to 11.8% at end-2026, and raises $8 billion over ten
  years. The alternative scenarios are now current law excluding the new forced-labor Section 301
  action, and current law excluding the polysilicon action; the Section 122-retained scenario is
  retired. The tracker was also rerun, revising the daily statutory rate history by small amounts
  (January 2025 moves from 2.675% to 2.678%). July 24 release archived to previous-vintages.

- Updated `tracker.yaml` scenario colors and the `events.yaml` marker list for the new vintage —
  both are keyed to the vintage-dated scenario ids and need re-pointing every release.

- **State of Tariffs: July 24, 2026 vintage.** Refreshed all figures to the published
  `2026072409` Tariff-Model artifact. The default scenario now incorporates the finalized
  Section 301 "forced-labor" tariffs (replacing the Section 122 surcharge on July 24); adds two
  alternatives — current law excluding new Section 301, and a Section 122-retained regime. Also
  corrects an error in the statutory tariff rate calculation in which the Section 232 metal tariffs
  were over-applied to certain products (revises both historical and projected rates). July 21
  release archived to previous-vintages.

- Cache-busting is now automatic: `build-manifest.py` stamps a content hash of the runtime JS+CSS
  as `?v=` on `app.js`/`styles.css` in `index.html`, and `app.js` propagates that version to its
  module imports (`render.js`, `download-all.js` → `zip-store.js`) via `import.meta.url` — so one
  hash busts the whole bundle on deploy. A `ci/validate.sh` hook fails the build if the committed
  stamp is stale (a runtime file changed without re-running `build-manifest.py`). The vendored
  engine keeps its own `?v=<engine version>`.

- Synced the 2026-07-21 model vintage (adds a third scenario, Current Law ex-S338) and seeded the
  2026-07-16 release as the first archived vintage.
- Re-vendored the chart engine to **1.6.1**, whose `staggerBarLabels` fix ends a floating-point
  infinite loop that hung the tab on the 3-scenario grouped-bar distribution figure (hover +
  legend multi-select). Dropped the interim `coordinated_cursor: false` workaround.
- Scenario colors are now set centrally in `tracker.yaml` (`scenario_colors:`, keyed by scenario
  id) and applied to every figure, overriding the positional palette; change-vs-default now uses
  each scenario's own color (removed the hardcoded violet override).
- Distribution figure: per-series annotation label override (`series_overrides`) flips the
  ex-S338 total label above its line so near-coincident totals' labels don't intersect.
- Removed the version number (uninformative) and the dead editorial `release.updated` date from
  `tracker.yaml`; the "Updated" date comes solely from the synced vintage's `published_at`.
- Added a **Previous Vintages** tab: vintage-date + scenario dropdowns that render an archived
  release's report exactly as published, plus a "Download this Vintage" button (the live "Download
  Report Data" button never includes archived data). Populated from
  `data/previous-vintages/*/vintage.json` by `build-manifest.py` (`load_vintages`); the tab is
  dropped from the build when no vintages exist. Each vintage stores a generic `scenarios` list, so
  nothing hard-codes which report scenarios exist.
- New `update.py <dashboard-dir>` at the tool root runs the full refresh pipeline in one command
  (sync → reconcile → build-manifest), stopping on the first failure and printing the remaining
  manual steps (the editorial changes note + commit/PR/merge). Excluded from the published site.
- `sync-model-data.py` now auto-archives the outgoing release into
  `data/previous-vintages/<interface-vintage>/` before overwriting data — freezing the *compiled*
  default- and alternative-scenario tabs (so old vintages don't re-derive from later configs) plus
  the copied CSVs and the carried-over "Changes since the last update" note (retitled "Changes for
  the DATE Update", shown on the vintage's summary page). The folder is keyed on the unique
  interface_vintage, not the date, so two releases on the same calendar day each archive
  separately; `build-manifest.py` appends the publish time to a dropdown label when a date has more
  than one vintage. Idempotent; `--archive-only` seeds/archives without syncing. Daily Statutory
  Rates are not archived.
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
