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
- Version: **1.13.0** (tag `v1.13.0`; cache-bust query in index.html is `?v=1.13.0`)
- Re-vendored from 1.6.1 on 2026-08-28, alongside the vintage-fidelity repair. What that bump
  required of this tool, and what it bought:
  - **1.8.0 removed subtitle-based unit inference.** A subtitle containing "percent" used to append
    `%` to every rendered value; nothing here set a value affix, so 171 archived chart parts and 10
    live config figures would have silently lost their `%`. All were given an explicit
    `value_suffix: "%"` in the same change. **Any new chart must set its own affix.**
  - **1.13.0 renders links in `note` and `source`.** 1.6.1's `renderSourceLine` did
    `p.textContent = note`; 1.13.0 routes both through a tokenizer that emits real anchors, guarded
    by an explicit `https://`/`mailto:` scheme check. Note text still cannot carry a hard line
    break — `\\` is a rich-text token for table CELLS and does not reach a note.
  - **1.12.0 requires `xAxisType: categorical` on `bar` and `stacked`**, else a validation error.
    All 147 archived bar/stacked parts were already categorical, so nothing refused.
  - **1.11.0 refuses colours the engine cannot paint.** Every colour in the archive is a palette
    token or valid hex.
  - Hover-only changes land on the 22 figures using `barStack`; the legend/tooltip/PNG key redraw
    from 1.11.0 touches every figure. `shading`, `valueLabels` and `highlightSeries` are unused.
  - `live.js` halves, 1,507,434 -> 1,018,615 bytes, and the font stops being embedded twice.
- **`CONFIG-SPEC.md` in the engine repo now matches what is vendored here.** While this tool ran
  1.6.1 against a 1.13.0 spec, two documented features did not exist in the vendored build — note
  links, and `\\` breaks in notes — and both produced wrong guidance before being caught.
- v1.6.1 fix (commit `8a631aa`): `staggerBarLabels` no longer hangs the tab.
- v1.6.0 added a histogram chart type (not used by this tool).
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
