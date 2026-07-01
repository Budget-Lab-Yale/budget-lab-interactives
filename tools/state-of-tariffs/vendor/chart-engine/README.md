# Vendored Budget Lab chart engine

This directory is a **vendored copy** of the Budget Lab chart engine's browser build. It is checked
in (not installed via npm) because `budget-lab-interactives` is a no-build static site — there is no
bundler or `node_modules` at deploy time.

| File | What it is |
|---|---|
| `live.js` | The engine's standalone IIFE bundle (`dist/embed/live.js`). Loaded with a plain `<script>` tag; exposes the global `window.BudgetLabChart` with `mountChart(el, {spec, rows})` and `mountTable(el, {spec, rows})`. Observable Plot + D3 are bundled in — no external runtime deps. |
| `chart-engine.css` | The engine's figure/table stylesheet (`CHART_CSS` from `dist/embed/styles.js`), which includes the `--tbl-*` design tokens. Covers `figure-card`, legend, crosshair tooltip, and `tbl-table*` classes. |
| `VERSION` | The engine version this copy was taken from. |

## Source

- Repo: `Budget-Lab-Yale/budget-lab-chart-engine` (`C:\dev\GitHub\budget-lab-chart-engine`)
- Version: **1.2.1** (tag `v1.2.1`, commit `5c08658`)
- v1.2.1 fix: faceted **horizontal** bar charts no longer force horizontal scrolling at normal
  widths (per-pane minimum lowered 300→240px; natural width ~816→~700px).
- v1.2.0 added: faceted **horizontal** bar charts, a **sectioned category axis**
  (`columns.section`), variable pane widths (`small_multiples.pane_widths`: `equal` |
  `equal-bar` | proportion array), and a reworked annotation-label placement system
  (`labelSide` / `labelPosition`). Behavior changes vs 1.1.x: `labelDy` sign flipped
  (**+ = up**), `labelAnchor` removed (use `labelSide`), `anchorAtZero` defaults `false` on
  numeric x, and in-bar value labels removed. Still includes 1.1.1's inline table math
  (rendered by the engine — **no MathJax at runtime**).

## Re-vendoring a new engine version

From the engine repo (after `npm install && npm run build` so `dist/` is current):

```sh
# from C:\dev\GitHub\budget-lab-chart-engine
cp dist/embed/live.js <interactives>/tools/state-of-tariffs/vendor/chart-engine/live.js
node --input-type=module -e "import {CHART_CSS} from './dist/embed/styles.js'; import {writeFileSync} from 'fs'; writeFileSync('<interactives>/tools/state-of-tariffs/vendor/chart-engine/chart-engine.css', CHART_CSS)"
# then update VERSION and this README's Source section
```

Do not hand-edit `live.js` or `chart-engine.css` — they are generated artifacts.
