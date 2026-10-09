# Model → interface data handoff

This tool's entire runtime is driven by one file, `data/data.json` (schema 3). It carries the
modelers' surrogate fit for run vintage **`toptax_v11_2026-09-28`**, refit 2026-10-01
(`git_sha 70a14e9`, 225 scenarios) to add the per-group dollar quantities `tax`/`taxc`.

**Current provenance:** the modelers' artifact, written verbatim by `scripts/sync-model-data.py`,
so `data/data.json` matches it byte for byte. All 31 `meta.surrogate.checks` reconcile against
`model.js` within the fit's own published bounds.

## What the modelers ship

The interface does not run the tax model. It runs a **surrogate** — a fitted response surface
over the 8 levers — entirely client-side (`model.js`, transcribed verbatim from the reference
app's evaluator, `simulator.html`'s `<script>` block, and commented as mirroring
`fit_surrogate.py`; the two must stay in lockstep). The modelers' artifact is `atlas2_data.json`,
fit from Tax-Simulator run vintage **`toptax_v11_2026-09-28`** by `other/top_tax/fit_surrogate.py`
and validated by `other/top_tax/check_atlas2_render.js`. The schema version has held at **v3**
across vintages, but it has been additive rather than frozen — v6 introduced the mechanical
quantity tier and the `deemed` exclusion sub-axis, both of which needed evaluator work. Assume a
refresh is a file drop, but run `node --test` before believing it.

Top-level keys: `meta`, `etr_base`, `income_levels`, `surrogate`.

## `meta`

- `schema` — schema version, currently `3`.
- `window` — `[first_year, last_year]` of the projection (2027–2056).
- `decades` — three `[start, end]` decade ranges. Most quantities are reported per decade
  (length-3 arrays, index 0/1/2).
- `gdp_fy_decades` — cumulative FY GDP per decade ($B), used for "% of GDP" formatting.
- `dist_years` — the year(s) the distribution/ETR tables are cut on (`[2027]`).
- `etr_slice` — provenance of the ETR cut: `taxes` (a sentence naming the taxes included) and
  `group_dimension`. Descriptive only; the keys changed at v11, so nothing reads them.
- `etr_income_defs` — `["hs", "expanded"]`, the two income bases the ETR/income tables come in.
  `hs` = Haig-Simons/accrual, `expanded` = cash. The page's cash/accrual toggle switches between
  them.
- `etr_comps` — the 6 tax components, in the fixed order used by every ETR and tax vector:
  `income_tax, payroll, estate, deemed, wealth, corp`. (Through v6 there were 8, with `vat` and
  `other`; `model.js` reads components by name, so the count is not pinned.)
- `etr_groups` — the 10 income groups, in order, from "Quintile 1" through "Top 0.01%". The
  quintiles partition every household; the top groups nest inside Quintile 5. (Through v6 an
  11th, "Negative income", led the list; `model.js` still filters it out if it reappears.)
- `levers` — canonical lever list and UI metadata (see below).
- `surrogate` — surrogate metadata (see below).

### `meta.levers[]`

Each lever: `key`, `label`, `grp` (color group), `kind` (`continuous` | `discrete` | `binary`),
`interp`, `cluster` (whether it enters the cluster/interaction terms), and `params[]`. The eight
levers are `ord, cg, corp, wealth, deemed, estate, qbi, taxmax`.

Each `param` carries: `key`, `label`, `unit`, `fmt`, `off` (the current-law/"switch off" value),
`ref` (the reference-package value), `knots` (the grid points the model was actually run at —
interpolation happens between these), `scale` (`linear` | `log` | `pos`), `min`, `max`, and
`anchors`. A **state** is `{ leverKey: { paramKey: value, ... }, ... }`; a lever absent from the
state is off, and a param absent from a lever's entry sits at its `off` value.

**`interp: ladder_x`** (new at v6, `deemed` only). A discrete position axis crossed with a
continuous one: `params[0]` is the ladder (`scale: 'pos'`, string `knots`
`['off', 'carryover', 'deemed']`), `params[1]` the gains-at-death **exclusion**
(`$0 / $1M / $5M`). Grid rows are position-major — row index is
`positionIndex * exclusionKnotCount + exclusionIndex` — so `surrogate.g.deemed` and every
`surrogate.solo.deemed[q]` carry 3 × 3 = 9 rows. The position axis is an exact index lookup, never
a numeric interpolation; the exclusion axis interpolates linearly. `interp: ladder` (a bare
position axis, no sub-dial) is the pre-v6 form and is still handled.

**`corp`** moved from a two-knot linear dial (21→28%, linear by construction off a single wedge) to
a five-knot interpolated one (21 / 24.5 / 28 / 31.5 / 35%), scored inside the model against the CBO
corporate receipts baseline. This is data-only — no evaluator change — but the page's provenance
note names the anchors, so it needs editing when they move.

### `meta.surrogate`

- `quantities` — the 13 output quantities, in three revenue tiers plus the ETR and tax slices:
  - **first-order** `st` (total, ×3 decades), `sy` (by-year, ×30), `sh` (by-head, ×21) — the tax
    change itself, accounting for neither cross-base interactions nor behavior;
  - **mechanical** `mt`/`my`/`mh` — first-order plus the interactions between tax bases, with
    taxpayer behavior still held fixed;
  - **collected** `ct`/`cy`/`ch` — mechanical plus behavioral response: the revenue actually
    collected;
  - `etr` (first-order ETR vector, 120 = 2 income defs × 10 groups × 6 comps) and `etrc`
    (collected ETR vector, 120);
  - `tax` (first-order change in tax, $B, same 120 layout) and `taxc` (collected change, 120).

  The ETR and tax slices are single-year (2027, `dist_years`), not decade-major: their pair and
  triple terms take the first decade's gain weights (`DECI` in `model.js`).

  **Each world's rate is divided by that world's own income.** On cash income, behavior moves
  realizations and with them the denominator, so a reform rate times current-law income is not
  the reform's dollars. The 2026-09-28 fit shipped without `tax`/`taxc` and the page did exactly
  that, putting $170B collected for a 40% capital gains rate where accrual income (and the
  model's total) said about $55B. The distribution card's new-tax dollars come from `tax`/`taxc`;
  only current-law tax is still rate × income.

  The stack view's three rungs are `sh` / `mh` / `ch`, differenced across a growing prefix of
  levers, so the three by-head vectors must share one layout.
- `m` — the length of each quantity's output vector: `{ct: 3, cy: 30, ch: 21, mt: 3, my: 30,
  mh: 21, st: 3, sy: 30, sh: 21, etr: 120, etrc: 120, tax: 120, taxc: 120}`.
- `heads_order` — the 7 revenue "heads" the by-head vectors decompose into: `iit, cg, pay, corp,
  est, wealth, other`.
- `ref` — the reference-package state (used for the dist card's reference bars).
- `cluster` — which levers participate in interaction terms: `["cg", "wealth", "deemed",
  "estate"]`.
- `validation` — accuracy of the surrogate vs. the real model runs: per-decade collected bounds
  `bounds_pct` (±1.6 / ±3.1 / ±3.6% at v11) and first-order bounds `static_bounds_pct` (±1.8 /
  ±1.1 / ±0.8%), plus quiz (`n`, `max_pct`, `median_pct`) and corner (`n`, `max_pct` only)
  holdout stats, `byyear_max_pct`, `heads_max_b`, `etr_max_pp`, a `passed` flag, and the fit
  `date`. The data badge on the page states these bounds, and `test/model.test.mjs` uses them as
  its tolerances — so a refit tightens or loosens the gate automatically.

  `passed` is `true` at v11: the quiz set's worst case is 1.55% against the fit's own 3.0%
  `hard_bar_pct` (median 0.63%). At v6 it was `false` (worst case 3.65%).
- `checks` — holdout fixtures (`{id, state, conv_totals, static_totals}`) the evaluator is verified
  against: at v6 and v11, 21 quiz-style checks (`q01`–`q20` plus `stack_ref`) and 10 "corner" points
  (`pc_*`, deliberately extreme lever combinations). The count grows with each vintage, so nothing
  in the tool pins it.

## `surrogate`

The coefficients themselves:

- `solo` — per-lever grids: `solo[leverKey][quantity]` is a row-major matrix, one row per knot
  combination, each row a length-`m[quantity]` output vector.
- `g` — per-lever 1-D "gain" shape functions used to warp between knots.
- `pairs`, `triples` — the 2- and 3-lever interaction correction terms (28 pairs, 56 triples)
  that capture how levers stack non-additively. Every pair/triple involving the discrete `deemed`
  ladder (and only those — `ord|deemed`, `cg|deemed`, `corp|deemed`, `wealth|deemed`,
  `deemed|estate`, `deemed|qbi`, `deemed|taxmax`, plus their triple combinations) additionally
  carries `byPos`: a map keyed by ladder position (`carryover`, `deemed`) holding the
  position-specific quantity vectors directly, in place of the generic gain-product form.
  `model.js` treats `byPos` as the discrete-lever escape hatch (`pairTerm`/`tripleTerm`).
- **`byExem`** (new at v6) — the same deemed *pairs* also carry measured interaction vectors at
  nonzero gains-at-death exclusions, keyed position → exclusion → quantity. Present only at the
  `deemed` position, and only on pairs; **no triple carries it**. Where it exists and the state's
  exclusion is above zero, `model.js` interpolates linearly in the exclusion between the exem-0
  `byPos` vector and these anchors (`exemInterp`), clamping above the top anchor. Where it does
  not, the `byPos` vector is scaled by the within-position ratio
  `g_deemed(pos, exem) / g_deemed(pos, 0)` (`ladderRatio`) instead. Both mirror
  `fit_surrogate._exem_interp` / `_ladder_ratio`; `test/data.test.mjs` fails if a future vintage
  puts `byExem` on a triple or on `carryover`, since the evaluator has no branch for either.

The full evaluation recipe (locate on knots → interpolate solo term → add pair and triple
corrections → assemble the quantity vector) is implemented in `simulator.html`/`model.js`; treat
that JS as the spec. Two invariants worth knowing: **empty state evaluates to exactly 0** (no
policy change → no revenue change), and **a state sitting exactly on a stored knot returns the
stored row verbatim** (no interpolation arithmetic).

## `etr_base` and `income_levels`

- `etr_base[incomeDef][year][group]` — baseline (current-law) ETR vector for that income group,
  in `etr_comps` order (length 6). The surrogate's `etr`/`etrc` outputs are **deltas** added onto
  this baseline.
- `income_levels[incomeDef][group]` — the group's current-law income ($B), used for the
  distribution card's income bars and its current-law tax (current-law rate × this income). It
  is NOT used to turn reform rates into dollars; see `tax`/`taxc` above.

## Regenerating the data (Budget Lab only)

`atlas2_data.json` is fit from a Tax-Simulator run vintage (`toptax_v11_2026-09-28`) by
`other/top_tax/fit_surrogate.py` and validated by `other/top_tax/check_atlas2_render.js`. The web
developer does not need this; it's here for provenance. When the data is refreshed, re-copy the
new `atlas2_data.json` — the schema is stable. Note that "stable" has meant additive so far, not
frozen: v6 added the mechanical quantity tier and the `deemed` exclusion sub-axis, both of which
did need evaluator work. `test/data.test.mjs` is the tripwire for that kind of change.

## What `scripts/sync-model-data.py` does

Given a path to a new `atlas2_data.json`, it validates the top-level contract (the four top-level
keys; `meta.schema === 3`; a non-empty `meta.surrogate.checks` whose fixtures each carry one
total per decade; all 13 `meta.surrogate.quantities` present with a vector length in
`meta.surrogate.m`; `surrogate.solo`, `surrogate.g`, `surrogate.pairs`, `surrogate.triples` all
present) and, if the artifact passes,
writes it to `data/data.json`. It does **not** re-derive the fidelity checks itself (that would
mean re-implementing `model.js`'s evaluator in Python); after syncing, run `node --test` from this
tool's directory — `test/model.test.mjs` re-checks every `meta.surrogate.checks` fixture against
`model.js` and is the fidelity gate. See the script's `# Run:` line for the exact invocation.
