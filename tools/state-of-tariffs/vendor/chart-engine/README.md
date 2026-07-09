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
- Version: **1.3.1** (commit `39ee9ac` — later than the initial 1.3.1 tag `34c3739`; adds the bar
  fixes below, so the cache-bust query in index.html is `?v=1.3.1-39ee9ac`)
- v1.3.1 tables: multi-tier header super-groups stay contiguous under `column_order` (which now
  orders the leaf tier *within* each super-group), a new `column_group_order` to order the
  super-groups, and `collapsible.control` (`"stub-header"` default → the expand/collapse-all
  control in the top-left corner cell; `"footer"` for the old placement).
- v1.3.1 bars (commits `36995da`, `39ee9ac`): the inline title-selector color accent now recolors
  **no-series** bar charts — **standalone and faceted** (so `bar_color` needn't be driven from the
  option color tool-side), and a **single-facet** small-multiples chart hovers with the bar-end
  pill instead of the legacy tooltip. All three tool workarounds removed on re-vendor.
- v1.3.0 added the features the State of Tariffs dashboard had been faking tool-side, so those
  workarounds were removed on re-vendor:
  - Tables: **`group_order`** + order-independent grouping (scenario-major CSV regroups
    correctly); native **collapsible row groups** (`collapsible: {default, expanded, collapsed}`);
    **`emphasis_rows`** now styles the stub cell too (HTML + PNG); **multi-tier header leaves**
    keyed by full header path (no more collisions).
  - Bars: **`bar_color`** (first-class single-series fill) and **`category_colors`** (per-x-category
    fill, e.g. a distinct Total bar).
  - Annotations: **`facet`** on xAxis/yAxis markers (per-pane reference lines), **`value_format`**
    + **`{value}`** token in labels, and numeric `annotations.xAxis` honored on horizontal bars.
  - Line/area: **`projected_field`** + **`projected_style`** (dashed projected runs / faded area).
  - Chrome: **`legend: false`**.
- Still includes the inline table math (rendered by the engine — **no MathJax at runtime**) and
  the 1.2.x faceted horizontal bars / sectioned category axis / variable pane widths.

## Re-vendoring a new engine version

From the engine repo (after `npm install && npm run build` so `dist/` is current):

```sh
# from C:\dev\GitHub\budget-lab-chart-engine
cp dist/embed/live.js <interactives>/tools/state-of-tariffs/vendor/chart-engine/live.js
node --input-type=module -e "import {CHART_CSS} from './dist/embed/styles.js'; import {writeFileSync} from 'fs'; writeFileSync('<interactives>/tools/state-of-tariffs/vendor/chart-engine/chart-engine.css', CHART_CSS)"
# then update VERSION, this README's Source section, and the ?v= cache-bust query on the
# vendored <link>/<script> in ../../index.html (bump it to the new version so browsers/CDNs
# don't serve the stale bundle)
```

Do not hand-edit `live.js` or `chart-engine.css` — they are generated artifacts.
