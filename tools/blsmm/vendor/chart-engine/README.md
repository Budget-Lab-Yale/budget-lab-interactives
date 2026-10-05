# Vendored Budget Lab chart engine

A **vendored copy** of the Budget Lab chart engine's browser build, checked in because this is a
no-build static site.

| File | What it is |
|---|---|
| `live.js` | The engine's standalone IIFE bundle (`dist/embed/live.js`). Exposes `window.BudgetLabChart` with `mountChart(el, {spec, rows})` and `mountTable(el, {spec, rows})`. |
| `chart-engine.css` | The engine's figure/table stylesheet (`CHART_CSS` from `dist/embed/styles.js`), including the `--tbl-*` design tokens. |
| `VERSION` | The engine version this copy was taken from. |

## Source

- Repo: `Budget-Lab-Yale/budget-lab-chart-engine`
- Version: **1.15.0** (tag `v1.15.0`, built from a clean checkout of the tag; cache-bust query in
  `../../index.html` is `?v=1.15.0`).
- The engine infers no units: every chart in `charts.js` sets its own `value_suffix`.

## Re-vendoring a new engine version

From the engine repo (after `npm install && npm run build` so `dist/` is current):

```sh
# from C:\dev\GitHub\budget-lab-chart-engine
cp dist/embed/live.js <interactives>/tools/blsmm/vendor/chart-engine/live.js
node --input-type=module -e "import {CHART_CSS} from './dist/embed/styles.js'; import {writeFileSync} from 'fs'; writeFileSync('<interactives>/tools/blsmm/vendor/chart-engine/chart-engine.css', CHART_CSS)"
# then update VERSION, this README's Source section, and the ?v= cache-bust query on the
# vendored <link>/<script> in ../../index.html (bump it to the new version so browsers/CDNs
# don't serve the stale bundle)
```

Do not hand-edit `live.js` or `chart-engine.css` — they are generated artifacts.
