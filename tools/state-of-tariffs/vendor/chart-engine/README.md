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
- Version: **1.1.1** (tag `v1.1.1`; the tagged tree is content-identical to release commit `24fb8ae`,
  "feat(table): inline math and row/group label overrides")
- v1.1.1 adds: inline math in table text (`\( … \)`, linear LaTeX subset → Unicode, rendered by the
  engine itself — **no MathJax needed at runtime**) and `row_labels` / `group_labels` overrides.

## Re-vendoring a new engine version

From the engine repo (after `npm install && npm run build` so `dist/` is current):

```sh
# from C:\dev\GitHub\budget-lab-chart-engine
cp dist/embed/live.js <interactives>/tools/state-of-tariffs/vendor/chart-engine/live.js
node --input-type=module -e "import {CHART_CSS} from './dist/embed/styles.js'; import {writeFileSync} from 'fs'; writeFileSync('<interactives>/tools/state-of-tariffs/vendor/chart-engine/chart-engine.css', CHART_CSS)"
# then update VERSION and this README's Source section
```

Do not hand-edit `live.js` or `chart-engine.css` — they are generated artifacts.
