# Budget Lab Interactives

Static site of interactive tools, served from the `gh-pages` branch at
interactives.budgetlab.yale.edu. Conventions: README.md (adding a tool, embedding) and
CONTRIBUTING.md (snapshots, testing).

## Hard invariants

- **No build step, plain JS.** The repo is published as-is (minus `.github/publish-exclude.txt`).
  Not TypeScript. A tool whose `.js` uses ES modules needs a `package.json` with
  `{"type": "module"}` so CI's `node --check` parses it.
- **Published URLs are permanent.** `/embed/v1/` is frozen: breaking loader changes ship as
  `/embed/v2/`. Additions to v1 must be opt-in by snippet attribute, so existing embeds run
  unchanged code (`data-deep-link`; gated by `.github/scripts/embed-loader.test.mjs`). Each `tools/<slug>/` URL and every `tools/<slug>/versions/<date>/` snapshot stays
  working indefinitely, and a snapshot is never edited after it is published: articles cite it.
- **`gh-pages` is machine-managed** by CI with `keep_files: true`, so a file removed from `main`
  stays published until pruned by hand. `CNAME` must stay committed or the custom domain drops and
  every embed breaks.
- **Every tool has `ci/smoke.json`**, with a marker that only appears after the tool has rendered
  from local data (gated in CI).
- **Vendored chart-engine copies are generated** (`vendor/chart-engine/`): re-vendor, don't
  hand-edit. Exception: state-of-tariffs carries one documented local patch (`1.13.0-p1`). The
  engine infers no units, so every chart sets its own `value_suffix`/`value_prefix`.
- **`tools/blsmm/vendor/blsmm-model/` must equal `Budget-Lab-Small-Macro-Model` at the ref in
  its `VERSION`.** That repo's CI holds the JS model to the R model; `tools/blsmm/ci/validate.sh`
  downloads the files at that ref and fails on any difference, so the ref must be pushed.
- **`tools/blsmm` asset stamps are generated** by `scripts/stamp-assets.mjs`; any change to its
  runtime JS/CSS or vendored model needs a re-stamp (gated by `validate.sh`).
- **`tools/blsmm` ports the Shiny app's display logic faithfully**, and every Levels chart value
  must match the model repo's `js/reference-values.mjs` (vendored; gated in `ci/tool.test.mjs`;
  r*, absent from that table, is checked against the simulation).
  Deliberate departures: the history chart point (the year before the window) uses the historical
  average rate on debt and has no r* (the Shiny app carries both over from the first forecast
  year; the reference table uses history, decided 2026-11-23); inputs run at full precision (the Shiny app rounded every delta to
  0.01), so presets match the R scenario files (`scenarios/results/` in the model repo); and chart styling (Levels
  baselines are always dashed and the legend always keys the scenario, where Shiny drew a solid
  baseline and no legend at zero shock; the real 10-year yield is amber; Fed Funds is listed
  before r*).
