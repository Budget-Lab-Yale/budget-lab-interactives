# Vendored BLSMM model

The model this tool runs, copied from
[`Budget-Lab-Small-Macro-Model`](https://github.com/Budget-Lab-Yale/Budget-Lab-Small-Macro-Model)
at the ref in `VERSION`.

| File | What it is |
|---|---|
| `blsmm-model.js` | `js/blsmm-model.js` upstream: `simulate()`, a JavaScript port of the R model's `simulate_blsmm_v1_8()`. |
| `model-data.json` | `js/model-data.json` upstream: forecast inputs, residuals, history, parameters and preset deltas, generated from the R repo's data by `js/export-data.R`. |
| `VERSION` | The upstream commit (or tag) both files were copied from. |

The R model is the reference. Upstream CI fails if the JS port disagrees with it on any output
column, so these files are only trustworthy as exact copies of a ref that passed that CI.
`ci/validate.sh` downloads both files at `VERSION` and fails on any difference: **never edit them
here.**

## Updating after a model change

```sh
# in Budget-Lab-Small-Macro-Model, on the commit to publish (pushed, CI green)
REF=$(git rev-parse HEAD)
cp js/blsmm-model.js js/model-data.json <interactives>/tools/blsmm/vendor/blsmm-model/
echo "$REF" > <interactives>/tools/blsmm/vendor/blsmm-model/VERSION
# in budget-lab-interactives
node tools/blsmm/scripts/stamp-assets.mjs
```

A model update changes published numbers, so take a dated snapshot of the tool first
(`node tools/blsmm/scripts/make-snapshot.mjs`, see CONTRIBUTING.md) and add a CHANGELOG entry.
