import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel } from '../model.js';
import { initState, surState, decadeLabels, incomeDefOptions, leverInfoBtn, leverInfoText, ladderPosOnToggle } from '../app.js';   // pure state helpers exported for test
import { usd, pg, pgs, roundedPg, dirAtPrecision, headColor, headHue, hueHex, headsInOrder, tipCard, engineSwatches } from '../render/shared.js';
import { buildDistSpec, buildRateSpec, rateTipCfg, distTipCfg, groupThousands, tickLabelHook, buildDumbbellRows, DUMBBELL_MEASURES, facetForGroup } from '../render/distribution.js';
import { layoutStack, buildStackExportSvg, buildStackCsv, segTipCfg, rungLevels, stepText, dialSummary, RUNGS, SCORE_RUNG } from '../render/stack.js';
import { whyCopy, isMaterial, SPILL_OWN, STEP_BEHAV_OWN, NO_BEHAV_TEXT } from '../render/stack-copy.js';
import { standaloneSvgMarkup, toCsv } from '../render/export.js';
const DATA = JSON.parse(readFileSync(new URL('../data/data.json', import.meta.url)));
const GDP0 = DATA.meta.gdp_fy_decades[0];   // first-decade GDP: the stack view's share denominator
const DEC0_LABEL = 'FY2027–36';
const EX_OPTS = { decadeLabel: DEC0_LABEL, dialSubtitles: {}, title: 'Test figure title' };

// ---- top-level controls (Task 8: budget-window + income-definition) -------

test('decadeLabels renders one label per decade from DECADES', () => {
  const model = createModel(DATA);
  const labels = decadeLabels(model.meta.DECADES);
  assert.equal(labels.length, model.meta.DECADES.length);            // 3
  // Literal, not re-derived from the same formula under test: pins the
  // format itself (start year in full, end year 2-digit), matching source
  // decLabel, so a consistently-wrong formula can't pass this test.
  assert.equal(labels[0], '2027–36');
});

// #incDefTog must be built from model.meta.INCOME_DEFS (== DATA.meta.
// etr_income_defs, the same array model.js's etrRowAt indexes into), not a
// hardcoded ['expanded','hs'] list — otherwise a future change to that
// array's values/order/count could desync the toggle from indexOf without
// any test catching it.
test('incomeDefOptions tracks DATA.meta.etr_income_defs exactly, order included', () => {
  const model = createModel(DATA);
  assert.deepEqual(model.meta.INCOME_DEFS, DATA.meta.etr_income_defs);
  const opts = incomeDefOptions(model.meta.INCOME_DEFS);
  assert.deepEqual(opts.map((o) => o.def), DATA.meta.etr_income_defs);
  assert.ok(opts.every((o) => typeof o.label === 'string' && o.label.length > 0));
});

test('surState includes only active levers in native units', () => {
  const model = createModel(DATA);
  const state = initState(model.meta.LEVERS);   // all off
  assert.deepEqual(surState(state, model.meta.LEVERS), {});   // nothing active → empty
  state.ord.on = true; state.ord.vals.rate = 44.8;
  const s = surState(state, model.meta.LEVERS);
  assert.deepEqual(Object.keys(s), ['ord']);
  assert.equal(s.ord.rate, 44.8);
});
// ---- distribution card rebuild (Task 10): dollar composition + dumbbell + facet ----
//
// buildDistSpec/buildDumbbellRows now read model.computeDistribution's per-group
// dollar+rate output (Task 9), not computeResults().etr — the prior buildDistSpec
// tests exercised the WRONG (component-ETR-stack) breakdown Sylva flagged and are
// replaced here, not merely extended.

function closeEnoughDist(a, b, tol) {
  return Math.abs(a - b) <= Math.max(tol, tol * Math.abs(b));
}

test('facetForGroup: the 5 top-decile groups land in topDecile, Quintiles 1-5 in main', () => {
  const model = createModel(DATA);
  const byFacet = { main: [], topDecile: [] };
  model.meta.PCTS.forEach(g => byFacet[facetForGroup(g)].push(g));
  assert.deepEqual(byFacet.main, ['Quintile 1', 'Quintile 2', 'Quintile 3', 'Quintile 4', 'Quintile 5']);
  assert.deepEqual(byFacet.topDecile, ['Top 10%', 'Top 5%', 'Top 1%', 'Top 0.1%', 'Top 0.01%']);
});

test('buildDistSpec context view: rows cover every group×segment and segments sum to income per group', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 44.8 } }, 0, 'expanded');
  const { spec, rows } = buildDistSpec(dist, 'context');
  assert.equal(spec.chartType, 'stacked');
  const groups = Object.keys(dist);
  assert.equal(rows.length, groups.length * 4);   // afterTaxIncome/currentLawTax/collectedNew/lostToBehavior
  assert.ok(rows.every(x => Number.isFinite(x.value) && x.segment && x.facet));
  groups.forEach(g => {
    const sum = rows.filter(x => x.group === g).reduce((t, x) => t + x.value, 0);
    assert.ok(closeEnoughDist(sum, dist[g].income, 1e-6), `${g}: segments sum ${sum} != income ${dist[g].income}`);
    assert.equal(rows.find(x => x.group === g).facet, facetForGroup(g));
  });
});

test('buildDistSpec new view: rows cover every group×2 segments and sum to staticNew per group', () => {
  const model = createModel(DATA);
  const corpMax = model.meta.BYKEY.corp.params[0].max;
  const dist = model.computeDistribution({ corp: { rate: corpMax } }, 0, 'expanded');
  const { rows } = buildDistSpec(dist, 'new');
  const groups = Object.keys(dist);
  assert.equal(rows.length, groups.length * 2);   // collectedNew/lostToBehavior
  assert.ok(rows.every(x => Number.isFinite(x.value)));
  groups.forEach(g => {
    const sum = rows.filter(x => x.group === g).reduce((t, x) => t + x.value, 0);
    assert.ok(closeEnoughDist(sum, dist[g].staticNew, 1e-6), `${g}: segments sum ${sum} != staticNew ${dist[g].staticNew}`);
  });
});

// The sum-to-income/staticNew assertions above are tautological: afterTaxIncome
// (:= income - currentLawTax - staticNew) and lostToBehavior (:= staticNew -
// collectedNew) are DEFINED as the differences that make the total reconcile,
// so the sum holds for ANY permutation of which dist field a segment key is
// mapped to — a transposed field<->segment mapping would still pass every
// assertion above. These two tests instead pin each segment's row value
// against the SPECIFICALLY NAMED dist field (segment keys are literally the
// same property names computeDistribution returns), which a transposition
// bug fails.
test('buildDistSpec context view: each segment row value equals the identically-named computeDistribution field', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ cg: { rate: 30 }, deemed: { pos: 'deemed' } }, 0, 'hs');
  const { rows } = buildDistSpec(dist, 'context');
  const FIELDS = ['afterTaxIncome', 'currentLawTax', 'collectedNew', 'lostToBehavior'];
  const checkGroups = ['Quintile 1', 'Top 0.1%'];
  checkGroups.forEach(g => {
    FIELDS.forEach(field => {
      const row = rows.find(x => x.group === g && x.segment === field);
      assert.ok(row, `missing ${g}/${field} row`);
      assert.equal(row.value, dist[g][field], `${g}/${field}: row value ${row.value} != dist.${field} ${dist[g][field]}`);
    });
  });
  // Non-vacuity: a broken mapping that zeroed everything out would still pass
  // assert.equal(0, 0) above, so pin that this state/group selection actually
  // carries nonzero values in at least one checked field.
  assert.ok(
    checkGroups.some(g => FIELDS.some(f => Math.abs(dist[g][f]) > 1e-6)),
    'expected at least one nonzero segment value — assertion would be vacuous otherwise'
  );
});

test('buildDistSpec new view: each segment row value equals the identically-named computeDistribution field', () => {
  const model = createModel(DATA);
  const corpMax = model.meta.BYKEY.corp.params[0].max;
  const dist = model.computeDistribution({ corp: { rate: corpMax } }, 0, 'expanded');
  const { rows } = buildDistSpec(dist, 'new');
  const FIELDS = ['collectedNew', 'lostToBehavior'];
  const checkGroups = ['Quintile 5', 'Top 0.1%'];
  checkGroups.forEach(g => {
    FIELDS.forEach(field => {
      const row = rows.find(x => x.group === g && x.segment === field);
      assert.ok(row, `missing ${g}/${field} row`);
      assert.equal(row.value, dist[g][field], `${g}/${field}: row value ${row.value} != dist.${field} ${dist[g][field]}`);
    });
  });
  assert.ok(
    checkGroups.some(g => FIELDS.some(f => Math.abs(dist[g][f]) > 1e-6)),
    'expected at least one nonzero segment value — assertion would be vacuous otherwise'
  );
});

// Task 14: the dollar-composition segments previously reused the stack
// chart's categorical hues (green/blue/violet/rose), which read as
// interchangeable with the per-lever stack below. Fix them to a dedicated
// gray/blue scheme so "kept"/"current-law" read as neutral background and
// only the plan's own new tax (collected/lost) is picked out in color — this
// also reserves blue for the distribution card, since the stack (Task 15)
// will exclude blue from its own palette to avoid the same collision.
test('buildDistSpec context/new views: series_colors reserve a fixed gray/blue palette (not the categorical hues reused for the stack chart)', () => {
  const model = createModel(DATA);
  const corpMax = model.meta.BYKEY.corp.params[0].max;
  const dist = model.computeDistribution({ corp: { rate: corpMax } }, 0, 'expanded');

  const ctx = buildDistSpec(dist, 'context').spec.series_colors;
  assert.equal(ctx.afterTaxIncome, '#BBBBBB');     // light gray  -- Style-Guide --tbl-annotation-dim
  assert.equal(ctx.currentLawTax, 'gray');         // dark gray   -- engine alias for --tbl-text-muted (#6D6D6D)
  assert.equal(ctx.collectedNew, 'blue');          // blue        -- --tbl-blue
  assert.equal(ctx.lostToBehavior, 'blue-light');  // light blue  -- --tbl-blue-200

  const nw = buildDistSpec(dist, 'new').spec.series_colors;
  assert.equal(nw.collectedNew, 'blue');
  assert.equal(nw.lostToBehavior, 'blue-light');

  // Non-vacuity: the four segment colors must actually resolve to distinct
  // hex values (a same-gray-for-both-grays or gray-mislabeled-as-blue bug
  // would still pass the literal-string assertions above if it reused a
  // value, so check the resolved hexes are 4-of-4 distinct).
  const RESOLVED = { gray: '#6D6D6D', blue: '#0072B2', 'blue-light': '#58A3E7' };
  const hexes = [ctx.afterTaxIncome, RESOLVED[ctx.currentLawTax], RESOLVED[ctx.collectedNew], RESOLVED[ctx.lostToBehavior]];
  assert.equal(new Set(hexes).size, 4, 'all four segment colors must resolve to distinct hex values');
});

// Task 14 item 3: the main pane (Quintiles 1-5) is relabeled "By income
// quintile". FACET_TITLES backs both buildDistSpec's small_multiples.
// pane_titles (asserted here) and the dumbbell's own pane headers
// (render/distribution.js mountDumbbell reads the same constant), so this
// single assertion covers both facet renderings.
test('buildDistSpec: main facet pane is relabeled "By income quintile"', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 44.8 } }, 0, 'expanded');
  const { spec } = buildDistSpec(dist, 'context');
  assert.equal(spec.small_multiples.pane_titles.main, 'By income quintile');
});

// The top-decile pane is a breakout WITHIN Quintile 5, not an additional slice:
// a reader who sums both panes double-counts Quintile 5. The title used to spell
// that out ("Top decile (within Quintile 5, not additional)") and now leans on
// the word "breakout" to carry it (Sylva, 2026-08-26). This pins the shorter
// wording so the pane cannot silently go back to a bare "Top decile", which
// would name a slice and disclose nothing.
test('buildDistSpec: the top-decile pane is titled as a breakout, not as a slice', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 44.8 } }, 0, 'expanded');
  const { spec } = buildDistSpec(dist, 'context');
  const title = spec.small_multiples.pane_titles.topDecile;
  assert.equal(title, 'Top decile breakout');
  assert.match(title, /breakout/i, 'the title must say the pane nests, not just name a decile');
});
// ---- stack row dial subtitle (Task 20) -------------------------------------
// Restores the source's dialSummary (scratchpad/handoff/simulator.html:
// 1060-1070) for the STACK rows — Task 12 item 7 dropped this as collateral
// while cleaning up the SIDEBAR lever-selector titles, which is a separate
// piece of UI (app.js's renderControls, untouched here).
test('dialSummary: a single continuous-rate lever reports "label value%"', () => {
  const model = createModel(DATA);
  const lever = model.meta.BYKEY.ord;
  const leverState = { on: true, vals: { rate: 44.8 } };
  assert.equal(dialSummary(lever, leverState), 'top rate 44.8%');
});

test('dialSummary: a bilinear (rate + $ threshold) lever joins both params with " · "', () => {
  const model = createModel(DATA);
  const lever = model.meta.BYKEY.wealth;
  const leverState = { on: true, vals: { rate: 2, thr: 50000000 } };
  const out = dialSummary(lever, leverState);
  assert.match(out, /rate 2%/);
  assert.match(out, /\$50M/);
  assert.match(out, / · /);
});

test('dialSummary: an off lever (or no state) reports an empty subtitle', () => {
  const model = createModel(DATA);
  const lever = model.meta.BYKEY.ord;
  assert.equal(dialSummary(lever, { on: false, vals: { rate: 44.8 } }), '');
  assert.equal(dialSummary(lever, null), '');
  assert.equal(dialSummary(null, { on: true, vals: {} }), '');
});

test('buildDumbbellRows: 3 measures x every group, finite rates', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ cg: { rate: 30 }, deemed: { pos: 'deemed' } }, 0, 'hs');
  const rows = buildDumbbellRows(dist);
  const groups = Object.keys(dist);
  assert.equal(rows.length, groups.length * DUMBBELL_MEASURES.length);
  assert.ok(rows.every(x => Number.isFinite(x.rate) && x.facet));
  DUMBBELL_MEASURES.forEach(m => {
    const forMeasure = rows.filter(x => x.measure === m.key);
    assert.equal(forMeasure.length, groups.length, `measure ${m.key} row count`);
  });
  groups.forEach(g => {
    const forGroup = rows.filter(x => x.group === g);
    assert.equal(forGroup.length, DUMBBELL_MEASURES.length);
    assert.ok(forGroup.every(x => x.facet === facetForGroup(g)));
  });
});

// ---- Task 17: stack view restored to an order-DEPENDENT per-head marginal --
// -------- waterfall (regression fix) ----------------------------------------
//
// Sylva's report: the stack "is just showing the revenue raised, not the
// complexity of losses and interactions." A Phase-2 rewrite had replaced the
// prototype's order-dependent cumulative-prefix waterfall with an order-
// independent Shapley attribution (one net value per policy), flattening the
// per-base drains and making drag purely cosmetic. layoutStack now consumes
// model.stackMarginals(s, order, dec)'s output directly; the underlying
// telescoping/order-dependence/negative-marginal identities are exercised
// against the model directly in test/model.test.mjs (stackMarginals is a
// model.js function) — these tests cover the render-layer geometry built on
// top of it.

test('layoutStack: rows follow the marginals order; each row is genuinely multi-base (the restored complexity)', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 44.8 }, corp: { rate: 28 } };
  const { rows, scale } = layoutStack(model.stackMarginals(state, ['corp', 'ord'], 0), GDP0);
  assert.deepEqual(rows.map(x => x.key), ['corp', 'ord']);
  assert.ok(scale > 0);
  rows.forEach((r) => {
    const net = Object.keys(r.conv).reduce((t, h) => t + r.conv[h], 0)
      - Object.keys(r.stat).reduce((t, h) => t + r.stat[h], 0);
    assert.ok(Math.abs(r.net - net) < 1e-9, `${r.key}: net ${r.net} != conv-stat ${net}`);
    // The regression this restores: a per-lever row used to collapse to one
    // segment colored by the lever's "principal" head. A real row's marginal
    // now genuinely spreads across more than one tax base.
    const touchedHeads = Object.keys(r.conv).filter((h) => Math.abs(r.conv[h]) >= 0.5);
    assert.ok(touchedHeads.length > 1, `${r.key} row should touch more than one base, got ${JSON.stringify(touchedHeads)}`);
  });
});

// The load-bearing behavior change from the flattened Shapley view: dragging
// must change the per-row VALUES (which row absorbs a shared interaction),
// not just their screen order — while the "Whole package" total telescopes
// to the identical figure regardless of order.
test('layoutStack row values are ORDER-DEPENDENT (a marginal waterfall, not Shapley) — the total still telescopes to the same package', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 44.8 }, corp: { rate: 28 } };
  const a = layoutStack(model.stackMarginals(state, ['corp', 'ord'], 0), GDP0);
  const b = layoutStack(model.stackMarginals(state, ['ord', 'corp'], 0), GDP0);
  const netByKey = (rows) => Object.fromEntries(rows.map(x => [x.key, x.net]));
  assert.notDeepEqual(netByKey(a.rows), netByKey(b.rows), 'expected reordering to change the per-row split');
  assert.ok(Math.abs(a.total.conv - b.total.conv) < 1e-6, 'the whole-package total must not change with order');
  assert.ok(Math.abs(a.total.stat - b.total.stat) < 1e-6, 'the whole-package static total must not change with order');
});

// Total row reconciles to computeResults' own aggregate totals — cg+deemed
// carries a large nonzero static pair interaction (unlike ord+corp, which has
// none and so wouldn't catch a regression in the static side specifically).
// 'ch'/'sh' (by-head) and 'ct'/'st' (aggregate) are independently-fit
// surrogate quantities over the same reform space, not one algebraically
// derived from the other, so the sum of 'ch' across heads matches evalQ('ct')
// only to the surrogate's own tiny fit residual, not float precision (unlike
// the exact within-'ch' telescoping test/model.test.mjs pins) — a relative
// tolerance many orders tighter than a real indexing/units bug would produce.
test('layoutStack: total row reconciles to computeResults\' actual/comboStatic (multi-lever state with a static interaction)', () => {
  const model = createModel(DATA);
  const state = { cg: { rate: 30 }, deemed: { pos: 'deemed' } };
  const r = model.computeResults(state, 0, 'expanded');
  const { total } = layoutStack(model.stackMarginals(state, ['cg', 'deemed'], 0), GDP0);
  const REL_TOL = 1e-4;
  assert.ok(Math.abs(total.conv - r.actual) <= REL_TOL * Math.abs(r.actual), `total.conv ${total.conv} != actual ${r.actual}`);
  assert.ok(Math.abs(total.stat - r.comboStatic) <= REL_TOL * Math.abs(r.comboStatic), `total.stat ${total.stat} != comboStatic ${r.comboStatic}`);
});

// Defensive: app.js's reconcileOrder is expected to filter stale keys before
// calling in, but a lever absent from the surrogate state contributes zero
// (evalQ excludes it), so layoutStack shouldn't throw/NaN if `order` briefly
// drifts ahead of the active-lever set.
test('layoutStack tolerates a key in `order` with no active state (defensive)', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 44.8 } };   // corp never turned on
  const { rows } = layoutStack(model.stackMarginals(state, ['ord', 'corp'], 0), GDP0);
  assert.deepEqual(rows.map(x => x.key), ['ord', 'corp']);
  assert.equal(rows[1].net, 0);
});

// ---- Task 15: fixed base->color map (guards the "shifting" bug) -----------
//
// headHue/HEAD_HUES (shared.js) is a fixed data table — checking that table
// directly (below) is a legitimate, narrow test of the DATA, but it cannot
// be the regression guard for the "shifting" bug: the bug never lived in
// that table (it was already static). It lived in the total row's
// now-removed LEVER_COLORS/leverColor RENDER path, which colored the total
// bar by which LEVER was active, not by headColor. A test that calls
// headColor(base) directly is a pure function of `base` alone and would
// have passed even with LEVER_COLORS still in place — it never touches the
// code path the bug was in. See the rendering-path test below for the real
// guard.
test('HEAD_HUES data: none of the 7 bases is a blue hue, and all 7 resolve to distinct colors', () => {
  const BASES = ['iit', 'cg', 'corp', 'est', 'wealth', 'pay', 'other'];
  BASES.forEach((b) => {
    const c = headColor(b);
    assert.notEqual(c, 'var(--tbl-blue)', `${b} resolved to the reserved --tbl-blue token`);
    assert.notEqual(c, 'var(--tbl-blue-200)', `${b} resolved to the reserved --tbl-blue-200 token`);
    assert.doesNotMatch(headHue(b), /blue/i, `${b}'s hue name is blue-ish: ${headHue(b)}`);
  });
  assert.equal(new Set(BASES.map(headColor)).size, BASES.length, 'all 7 base colors must be distinct');
});

// The regression guard this used to encode (no per-lever tint of a shared
// base) is now structurally guaranteed — segment color always goes through
// headColor(head), never a lever-keyed map (removed at Task 15; Task 17
// removed the per-lever "principal head" collapse that would have been the
// only way to reintroduce it). What's worth pinning at the render layer:
// the SAME base (`est`) reached via two unrelated real lever states (`estate`,
// a continuous rate; `deemed`, a ladder position) resolves to the identical
// literal hex in the exported SVG, and neither export leaks the reserved blue.
test('buildStackExportSvg: the same base (est) resolves to the identical color whether reached via `estate` or `deemed`, with no blue anywhere', () => {
  const model = createModel(DATA);
  const BLUE_HEXES = ['#0072B2', '#58A3E7', '#77BEFF', '#95DAFF', '#3689CB', '#0070AF', '#005794', '#00407A', '#002B61'];
  const estHex = hueHex(headHue('est'));   // full strength: the collected rung

  const svgEstate = buildStackExportSvg(layoutStack(model.stackMarginals({ estate: { rate: 50 } }, ['estate'], 0), GDP0), GDP0, EX_OPTS);
  const svgDeemed = buildStackExportSvg(layoutStack(model.stackMarginals({ deemed: { pos: 'deemed' } }, ['deemed'], 0), GDP0), GDP0, EX_OPTS);

  assert.ok(svgEstate.includes(estHex), 'estate-state export should render an est-base segment in the fixed est color');
  assert.ok(svgDeemed.includes(estHex), 'deemed-state export should render an est-base segment in the fixed est color');

  BLUE_HEXES.forEach((hex) => {
    assert.ok(!svgEstate.includes(hex), `estate-state export contains a blue hex (${hex})`);
    assert.ok(!svgDeemed.includes(hex), `deemed-state export contains a blue hex (${hex})`);
  });
});

// Task 15's single-legend guard, updated for Task 17's restored per-head
// splits: `ord`+`qbi`+`corp` (a real, in-range state) now spreads across 5
// tax bases (iit, cg, pay, corp, est — computed directly from
// model.stackMarginals; wealth/other stay at 0 since no wealth lever is
// active), not the 2-per-lever-principal-head set the flattened Shapley view
// produced. The legend must list exactly those 5, no more (a leftover
// per-policy legend, or one still capped to each lever's old "principal"
// head, would drift from this count).
test('buildStackExportSvg: legend lists exactly the tax bases actually present, no blue hex anywhere', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 44.8 }, qbi: { on: 1 }, corp: { rate: 28 } };
  const layout = layoutStack(model.stackMarginals(state, ['ord', 'qbi', 'corp'], 0), GDP0);
  const svg = buildStackExportSvg(layout, GDP0, EX_OPTS);

  const BLUE_HEXES = ['#0072B2', '#58A3E7', '#77BEFF', '#95DAFF', '#3689CB', '#0070AF', '#005794', '#00407A', '#002B61'];
  BLUE_HEXES.forEach((hex) => assert.ok(!svg.includes(hex), `export SVG contains a blue hex (${hex})`));

  const swatchMatches = svg.match(/width="14" height="12" rx="1" fill="[^"]+"/g) || [];
  assert.equal(swatchMatches.length, 5, 'expected exactly one legend swatch per base actually present (iit, cg, pay, corp, est)');
});

// ---- three rungs: geometry, tint ladder, and the step arithmetic ----------
// The stack view's central change: every row now carries first-order,
// mechanical and collected on three equal-thickness bars, distinguished by the
// Style-Guide tint tier rather than by opacity.

test('RUNGS: ascending ladder steps, the score rung double-thickness, no vertical overlap', () => {
  assert.deepEqual(RUNGS.map(u => u.k), ['stat', 'mech', 'conv']);
  assert.deepEqual(RUNGS.map(u => u.step), [1, 2, 3]);
  // The collected rung is the score, drawn at double the workings' thickness.
  assert.equal(SCORE_RUNG.k, 'conv');
  assert.equal(SCORE_RUNG.h, RUNGS[0].h * 2);
  assert.equal(RUNGS[0].h, RUNGS[1].h, 'the two upper rungs stay equal to each other');
  // The thinner bars are also held back by opacity, so the score reads first.
  assert.ok(RUNGS[0].opacity < RUNGS[1].opacity, 'first-order should be the faintest');
  assert.ok(RUNGS[1].opacity < SCORE_RUNG.opacity, 'mechanical should sit behind the score');
  assert.equal(SCORE_RUNG.opacity, 1, 'the score rung is drawn at full strength');
  for (let i = 1; i < RUNGS.length; i++) {
    assert.ok(RUNGS[i].y >= RUNGS[i - 1].y + RUNGS[i - 1].h, `rung ${RUNGS[i].k} overlaps the one above it`);
  }
});

test('layoutStack: every row carries all three rungs, and the x-domain spans the widest of them', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 44.8 }, corp: { rate: 28 } };
  const layout = layoutStack(model.stackMarginals(state, ['ord', 'corp'], 0), GDP0);
  const segPos = (seg) => Object.keys(seg).reduce((t, h) => t + Math.max(0, seg[h]), 0);
  layout.rows.forEach((r) => {
    RUNGS.forEach((u) => assert.ok(r[u.k], `row ${r.key} is missing its ${u.k} rung`));
  });
  // First-order is the largest gross figure for a package of pure rate rises,
  // so the domain must be wide enough for it — a domain fitted to the collected
  // rung alone would clip the palest bar.
  const widest = Math.max(...layout.rows.concat([{
    stat: layout.total.statSeg, mech: layout.total.mechSeg, conv: layout.total.convSeg
  }]).map(r => Math.max(...RUNGS.map(u => segPos(r[u.k])))));
  assert.ok(layout.posMax >= widest - 1e-9, `posMax ${layout.posMax} clips the widest bar ${widest}`);
});

// The axis prints shares of GDP, so its ticks must be round in that unit. The
// reference prototype picks nice DOLLAR steps and then labels them as shares,
// which reads as 0.50% / 1.01% / 1.51%.
test('layoutStack: axis ticks are round shares of GDP, not round dollars', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 45 }, cg: { rate: 37 }, corp: { rate: 35 } };
  const { ticks } = layoutStack(model.stackMarginals(state, ['ord', 'cg', 'corp'], 0), GDP0);
  assert.ok(ticks.length >= 3, `expected several ticks, got ${ticks.length}`);
  ticks.forEach((t) => {
    const pct = t / GDP0 * 100;
    // Round to the two decimals the label shows, then confirm nothing was lost.
    assert.ok(Math.abs(pct - parseFloat(pct.toFixed(2))) < 1e-9, `tick at ${pct}% is not a round share`);
  });
  const steps = ticks.slice(1).map((t, i) => (t - ticks[i]) / GDP0 * 100);
  steps.forEach((s) => assert.ok(Math.abs(s - steps[0]) < 1e-9, 'tick spacing must be uniform'));
});

test('layoutStack: the total row reconciles on the mechanical rung too', () => {
  const model = createModel(DATA);
  const state = { cg: { rate: 30 }, deemed: { pos: 'deemed', exem: 1000000 } };
  const marginals = model.stackMarginals(state, ['cg', 'deemed'], 0);
  const { rows, total } = layoutStack(marginals, GDP0);
  const net = (seg) => Object.keys(seg).reduce((t, h) => t + seg[h], 0);
  const summed = rows.reduce((t, r) => t + net(r.mech), 0);
  assert.ok(Math.abs(summed - total.mech) < 1e-6, `rows' mechanical ${summed} != total ${total.mech}`);
});

// The printed step arrow is the difference of the two printed levels, so it must
// be computed from the rounded shares, never the raw ones — otherwise a row can
// show 0.52% above 0.50% with a "0.01%" step beside it.
test('roundedPg: step arrows tie exactly to the two levels printed above them', () => {
  const gdp = 400000;
  const a = 0.0206 * gdp / 100 * 100 / 100;   // lands near a rounding boundary
  const b = a - 0.00004 * gdp;
  const step = roundedPg(a, gdp) - roundedPg(b, gdp);
  const shown = parseFloat(pgs(a, gdp)) - parseFloat(pgs(b, gdp));
  assert.ok(Math.abs(step - shown) < 1e-9, `step ${step} does not equal the printed difference ${shown}`);
});

test('pgs: signs a negative share with a real minus sign, two decimals', () => {
  const gdp = 400000;
  assert.equal(pgs(4000, gdp), '1.00%');
  assert.equal(pgs(-4000, gdp), '−1.00%');
  assert.ok(!pgs(-4000, gdp).includes('-'), 'should use U+2212, not a hyphen');
});

// ---- fixed tax-base order and palette -------------------------------------
// Sylva, 2026-08-04: bases were shuffling with the policy rows, and amber-400
// (#985E00) read as a second russet rather than as amber.

test('headsInOrder: a canonical order, independent of the order bases are discovered in', () => {
  const canonical = headsInOrder(['iit', 'cg', 'corp', 'est', 'wealth', 'pay']);
  assert.deepEqual(headsInOrder(['pay', 'wealth', 'est', 'corp', 'cg', 'iit']), canonical);
  assert.deepEqual(headsInOrder(['corp', 'iit', 'pay']), ['iit', 'corp', 'pay']);
  // An unknown base still renders, after the known ones.
  assert.deepEqual(headsInOrder(['pay', 'vat', 'iit']), ['iit', 'pay', 'vat']);
});

test('bar segments and legend follow the canonical base order for BOTH policy orders', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 45 }, corp: { rate: 35 }, cg: { rate: 37 } };
  const fills = (order) => {
    const layout = layoutStack(model.stackMarginals(state, order, 0), GDP0);
    const svg = buildStackExportSvg(layout, GDP0, EX_OPTS);
    // Legend swatch fills, in the order they are emitted.
    return (svg.match(/width="14" height="12" rx="1" fill="([^"]+)"/g) || []);
  };
  assert.deepEqual(fills(['ord', 'corp', 'cg']), fills(['cg', 'corp', 'ord']),
    'legend order must not depend on the policy row order');
});

test('the six tax-base colors are distinct, and no two are the same brown', () => {
  const BASES = ['iit', 'cg', 'corp', 'est', 'wealth', 'pay'];
  const hexes = BASES.map((b) => hueHex(headHue(b)));
  assert.equal(new Set(hexes).size, BASES.length, 'all six must be distinct');
  // Payroll (amber) must be an actual gold, not the dark brown amber-400 is:
  // its red channel should dominate and it should be far lighter than russet.
  const amber = hueHex(headHue('pay')), russet = hueHex(headHue('iit'));
  const lum = (hex) => parseInt(hex.slice(1, 3), 16) * 0.299 + parseInt(hex.slice(3, 5), 16) * 0.587 + parseInt(hex.slice(5, 7), 16) * 0.114;
  assert.notEqual(amber, '#985E00', 'payroll should not use the brown amber-400');
  assert.ok(lum(amber) - lum(russet) > 30, `amber (${amber}) is too close in value to russet (${russet})`);
});

test('every ladder step of every base resolves to a distinct color', () => {
  const BASES = ['iit', 'cg', 'corp', 'est', 'wealth', 'pay'];
  const all = [];
  BASES.forEach((b) => RUNGS.forEach((u) => all.push(hueHex(headHue(b), u.step))));
  assert.equal(new Set(all).size, all.length, 'a base/step pair collided with another');
});

// ---- per-slice hover cards -------------------------------------------------
// Sylva, 2026-08-04: content brought back to the reference prototype's own
// readout (its barCfg), rendered in the engine's visual idiom. An earlier
// minimal version dropped too much; the one-card-per-ROW version before that
// restated the row totals already printed beside the bars.

test('segTipCfg: the title is the policy and the tax base, nothing else', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ corp: { rate: 35 } }, ['corp'], 0), GDP0);
  const cfg = segTipCfg('iit', rows[0].conv.iit, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  assert.equal(cfg.head, 'Corporate rate · Individual income base');
  // The stage and the budget window moved off the title: the window to the
  // smaller line below it, the stage to the marked row.
  assert.ok(!cfg.head.includes(DEC0_LABEL), 'budget window should not be in the title');
  assert.ok(!cfg.head.includes(SCORE_RUNG.label), 'stage should not be in the title');
});

// Every stage row carries dollars beside its share of GDP.
test('segTipCfg: each stage row pairs dollars with the share, for the same figure', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ corp: { rate: 35 } }, ['corp'], 0), GDP0);
  const row = rows[0];
  const cfg = segTipCfg('corp', row.conv.corp, SCORE_RUNG, row, GDP0, DEC0_LABEL);
  RUNGS.forEach((u, i) => {
    const v = row[u.k].corp;
    assert.equal(cfg.rows[i].alt, usd(v), `${u.k} dollars`);
    assert.equal(cfg.rows[i].value, pgs(v, GDP0), `${u.k} share`);
  });
});

// "Estate / deemed at death base" does not read; the title shortens that one.
test('segTipCfg: the compound estate label is shortened in the title only', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ estate: { rate: 60, exem: 5000000 } }, ['estate'], 0), GDP0);
  const cfg = segTipCfg('est', rows[0].conv.est, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  assert.equal(cfg.head, 'Estate tax · Estate base');
  // The legend keeps the full label, so the two must not have collapsed together.
  const svg = buildStackExportSvg(layoutStack(model.stackMarginals({ estate: { rate: 60, exem: 5000000 } }, ['estate'], 0), GDP0), GDP0, EX_OPTS);
  assert.ok(svg.includes('Estate / deemed at death'), 'the legend should keep the full base label');
});

test('segTipCfg: the settings and budget window sit on the smaller line below', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ wealth: { rate: 2, thr: 50000000 } }, ['wealth'], 0), GDP0);
  rows[0].subtitle = 'rate 2% · $50M';
  const cfg = segTipCfg('wealth', rows[0].conv.wealth, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  assert.equal(cfg.meta, 'rate 2% · $50M · ' + DEC0_LABEL);
});

test('segTipCfg: with no dial settings the meta line is just the budget window', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ qbi: { on: 1 } }, ['qbi'], 0), GDP0);
  const cfg = segTipCfg('iit', rows[0].conv.iit, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  assert.equal(cfg.meta, DEC0_LABEL);
});

// The head no longer names the stage, so the row the pointer is on has to.
test('segTipCfg: exactly one row is marked current, and it is the hovered stage', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ corp: { rate: 35 } }, ['corp'], 0), GDP0);
  RUNGS.forEach((u) => {
    const cfg = segTipCfg('corp', rows[0][u.k].corp, u, rows[0], GDP0, DEC0_LABEL);
    const marked = cfg.rows.filter((r) => r.current);
    assert.equal(marked.length, 1, `${u.k}: expected exactly one current row`);
    assert.equal(marked[0].label, u.label);
  });
});

test('segTipCfg: the hovered figure is the hero, with its dollar equivalent alongside', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ ord: { rate: 45 } }, ['ord'], 0), GDP0);
  const value = rows[0].conv.iit;
  const cfg = segTipCfg('iit', value, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  assert.equal(cfg.amount, pgs(value, GDP0));
  assert.equal(cfg.sub, usd(value) + ' over the decade');
  assert.equal(cfg.glyph, '▴');
});

test('segTipCfg: a drained slice is flagged as down, in the loss color', () => {
  const model = createModel(DATA);
  // The corporate rate marks corporate equity down, so realized gains fall: a
  // drain big enough to show at the 0.01%-of-GDP precision the card prints.
  const { rows } = layoutStack(model.stackMarginals({ corp: { rate: 35 } }, ['corp'], 0), GDP0);
  assert.ok(rows[0].conv.cg / GDP0 * 100 < -0.005, 'fixture should drain the capital-gains base materially');
  const cfg = segTipCfg('cg', rows[0].conv.cg, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  assert.equal(cfg.glyph, '▾');
  assert.match(cfg.glyphColor, /red/);
});

// The bug in Sylva's screenshot: "▾ 0.00%" — a red down-caret over a value the
// card itself prints as zero. Same rule the step arrows already followed.
test('segTipCfg: a slice that rounds to zero gets no caret at all', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ ord: { rate: 50 }, cg: { rate: 50 } }, ['ord', 'cg'], 0), GDP0);
  const ordRow = rows.find((r) => r.key === 'ord');
  const tiny = ordRow.conv.pay;
  assert.ok(tiny < 0 && Math.abs(tiny / GDP0 * 100) < 0.005, 'fixture should be a sub-precision drain');
  const cfg = segTipCfg('pay', tiny, SCORE_RUNG, ordRow, GDP0, DEC0_LABEL);
  assert.equal(cfg.amount, '0.00%');
  assert.equal(cfg.glyph, '', 'no caret when the printed figure is zero');
});

test('dirAtPrecision: direction follows the printed precision, not the raw value', () => {
  assert.equal(dirAtPrecision(-0.004, 2), 0);
  assert.equal(dirAtPrecision(0.004, 2), 0);
  assert.equal(dirAtPrecision(-0.02, 2), -1);
  assert.equal(dirAtPrecision(0.02, 2), 1);
  // A pp change printed to one decimal rounds away sooner.
  assert.equal(dirAtPrecision(-0.04, 1), 0);
  assert.equal(dirAtPrecision(-0.4, 1), -1);
});

// The rows track THIS BASE across the three stages. That is not what the row
// prints beside the bar (those are row totals across all bases), so it is new
// information rather than a restatement.
test('segTipCfg: rows are the hovered base on all three stages, each in its own tint', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ corp: { rate: 35 } }, ['corp'], 0), GDP0);
  const row = rows[0];
  const cfg = segTipCfg('corp', row.conv.corp, SCORE_RUNG, row, GDP0, DEC0_LABEL);
  assert.deepEqual(cfg.rows.map((r) => r.label), RUNGS.map((u) => u.label));
  RUNGS.forEach((u, i) => {
    assert.equal(cfg.rows[i].value, pgs(row[u.k].corp, GDP0), `${u.k} value should be this base's, not the row total`);
    assert.equal(cfg.rows[i].color, headColor('corp', u.step));
  });
  // Not the row totals.
  const rowTotal = pgs(rungLevels(row, GDP0)[0].value, GDP0);
  assert.notEqual(cfg.rows[0].value + '|' + cfg.rows[2].value, rowTotal + '|' + rowTotal);
});

// The policy name and its swatch used to be repeated on a line low in the card;
// the title carries the policy now, so that line is gone entirely.
test('segTipCfg: no repeated policy line or swatch below the readout', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ corp: { rate: 35 } }, ['corp'], 0), GDP0);
  rows[0].subtitle = 'rate 35%';
  const cfg = segTipCfg('cg', rows[0].conv.cg, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  assert.ok(!cfg.ctx, 'the context line should be gone');
  assert.equal(cfg.head, 'Corporate rate · Capital gains base');
  // The policy is named once, in the title.
  const occurrences = JSON.stringify(cfg).split('Corporate rate').length - 1;
  assert.equal(occurrences, 1, 'the policy name should appear exactly once');
  assert.match(cfg.note, /equity/i, 'the corp|cg channel is the equity markdown');
});

test('segTipCfg: the package row is named as such and claims no single mechanism', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 45 }, corp: { rate: 35 } };
  const layout = layoutStack(model.stackMarginals(state, ['ord', 'corp'], 0), GDP0);
  const totalRow = { key: null, isTotal: true, stat: layout.total.statSeg, mech: layout.total.mechSeg, conv: layout.total.convSeg };
  const cfg = segTipCfg('iit', totalRow.conv.iit, SCORE_RUNG, totalRow, GDP0, DEC0_LABEL);
  assert.equal(cfg.head, 'Whole package · Individual income base');
  assert.equal(cfg.meta, DEC0_LABEL, 'the package row has no dial settings of its own');
  assert.match(cfg.note, /The total effect of the package as a whole/);
});

// The overflow Sylva caught: a compound label plus a compound value in one
// `nowrap` row ran past the card's right edge. Each part of the card now carries
// one kind of thing, which is what bounds the row widths.
test('tipCard: no row packs a unit or a dollar total into its label or value', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ wealth: { rate: 2, thr: 50000000 } }, ['wealth'], 0), GDP0);
  const cfg = segTipCfg('wealth', rows[0].conv.wealth, SCORE_RUNG, rows[0], GDP0, DEC0_LABEL);
  cfg.rows.forEach((r) => {
    assert.ok(!/of GDP|\$/.test(r.value), `row value "${r.value}" should be a bare percentage`);
    assert.ok(!/·/.test(r.label), `row label "${r.label}" should not be compound`);
    assert.ok(r.label.length + r.value.length < 34, `row "${r.label} ${r.value}" is too wide for the card`);
  });
});

test('tipCard renders the engine tooltip idiom, with the meta and hero lines', () => {
  const html = tipCard({
    head: 'Corporate rate · Corporate',
    meta: 'rate 35% · FY2027–36',
    glyph: '▴', glyphColor: 'var(--tbl-green-400)',
    amount: '0.51%', sub: '$2.03T over the decade',
    rows: [
      { color: 'var(--tbl-red-200)', label: 'First-order tax change', alt: '$3.32T', value: '0.83%' },
      { color: 'var(--tbl-red-400)', label: '+ behavioral effects', alt: '$2.03T', value: '0.51%', current: true }
    ],
    note: 'Because reasons.'
  });
  assert.ok(html.includes('tbl-tooltip-head'), 'should use the engine head class');
  assert.ok(html.includes('tbl-tooltip-row'), 'should use the engine row class');
  // The swatch carries no shape class: 1.11.0 retired the swatch shape classes when
  // every key moved to SVG, so `is-square` styled nothing. The box is square by
  // default and the colour arrives inline.
  assert.ok(html.includes('tbl-tooltip-swatch'), 'should use the engine swatch class');
  assert.ok(!html.includes('is-square'), 'is-square is a dead class in 1.11.0');
  assert.ok(html.includes('tt-meta'), 'settings/period line missing');
  assert.ok(html.includes('tt-alt'), 'dollar lane missing');
  assert.ok(html.includes('tt-hero') && html.includes('tt-amount'), 'hero line missing');
  assert.ok(html.includes('tt-note'), 'mechanism sentence missing');
  assert.equal(html.split('is-current').length - 1, 1, 'exactly one row marked current');
  assert.ok(!html.includes('tt-ctx'), 'the repeated policy line should be gone');
  assert.ok(!html.includes('ttcard'), 'the old bespoke card wrapper should be gone');
});

test('tipCard keys a hollow marker as a ring, not a filled box', () => {
  const filled = tipCard({ rows: [{ color: 'var(--tbl-blue)', label: 'Collected', value: '9.0%' }] });
  const hollow = tipCard({ rows: [{ color: 'var(--tbl-blue)', label: 'Ask', value: '9.4%', hollow: true }] });
  assert.ok(/background:var\(--tbl-blue\)/.test(filled), 'a filled row fills its swatch');
  assert.ok(/box-shadow:inset 0 0 0 2px var\(--tbl-blue\)/.test(hollow), 'a hollow row rings its swatch');
  assert.ok(!/box-shadow/.test(filled), 'a filled row must not draw a ring');
});

test('rungLevels: steps are differences of the ROUNDED levels, first rung has none', () => {
  const model = createModel(DATA);
  const { rows } = layoutStack(model.stackMarginals({ ord: { rate: 45 } }, ['ord'], 0), GDP0);
  const levels = rungLevels(rows[0], GDP0);
  assert.equal(levels.length, 3);
  assert.equal(levels[0].step, null);
  for (let i = 1; i < levels.length; i++) {
    const expected = roundedPg(levels[i].value, GDP0) - roundedPg(levels[i - 1].value, GDP0);
    assert.ok(Math.abs(levels[i].step - expected) < 1e-9, `rung ${i} step is not the printed difference`);
  }
});

// A green ▴0.00% claims a gain the number beside it denies.
test('stepText: a step that rounds to zero gets no arrow and no direction', () => {
  assert.deepEqual(stepText(null), { text: '', dir: 0 });
  assert.deepEqual(stepText(0.004), { text: '0.00%', dir: 0 });
  assert.deepEqual(stepText(-0.004), { text: '0.00%', dir: 0 });
  assert.deepEqual(stepText(0.05), { text: '▴0.05%', dir: 1 });
  assert.deepEqual(stepText(-0.2), { text: '▾0.20%', dir: -1 });
});

test('pgs: a value that rounds to zero prints unsigned', () => {
  const gdp = 400000;
  assert.equal(pgs(-1, gdp), '0.00%');
  assert.equal(pgs(-1000, gdp), '−0.25%');
});

// ---- data export ----------------------------------------------------------
// Sylva, 2026-08-04: the package score had no data download at all.

test('toCsv: quotes only cells that need it, doubling embedded quotes', () => {
  const out = toCsv([['a', 'b,c', 'd"e', 'f\ng'], [1, 2, 3, 4]]);
  assert.equal(out.split('\r\n')[0], 'a,"b,c","d""e","f\ng"');
  assert.equal(out.split('\r\n')[1], '1,2,3,4');
  assert.throws(() => toCsv([]));
});

test('buildStackCsv: total rows carry the score, base rows decompose it and sum back', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 45 }, corp: { rate: 35 } };
  const layout = layoutStack(model.stackMarginals(state, ['ord', 'corp'], 0), GDP0);
  const rows = buildStackCsv(layout, GDP0, DEC0_LABEL, { ord: 'top rate 45%', corp: 'rate 35%' });

  const header = rows[0];
  assert.deepEqual(header, ['budget_window', 'position', 'policy', 'settings', 'stage', 'scope',
    'tax_base', 'revenue_usd_billions', 'share_of_gdp_percent']);
  const col = (name) => header.indexOf(name);
  const body = rows.slice(1);
  assert.ok(body.every((r) => r[col('budget_window')] === DEC0_LABEL));
  assert.ok(body.some((r) => r[col('settings')] === 'rate 35%'), 'dial settings travel with the data');
  assert.ok(body.some((r) => r[col('policy')] === 'Whole package'));

  // Within one policy and stage, the base rows must sum to the total row.
  const key = (r) => r[col('policy')] + '|' + r[col('stage')];
  const totals = {}, sums = {};
  body.forEach((r) => {
    const v = Number(r[col('revenue_usd_billions')]);
    if (r[col('scope')] === 'total') totals[key(r)] = v;
    else sums[key(r)] = (sums[key(r)] || 0) + v;
  });
  Object.keys(totals).forEach((k) => {
    assert.ok(Math.abs(totals[k] - (sums[k] || 0)) < 0.01, `${k}: bases ${sums[k]} != total ${totals[k]}`);
  });

  // Every stage appears, so a reader can rebuild all three rungs.
  RUNGS.forEach((u) => assert.ok(body.some((r) => r[col('stage')] === u.label), `stage ${u.label} missing`));
});

test('buildStackCsv: the whole-package total matches the model, not a re-derivation', () => {
  const model = createModel(DATA);
  const state = { cg: { rate: 30 }, deemed: { pos: 'deemed', exem: 1000000 } };
  const r = model.computeResults(state, 0, 'expanded');
  const layout = layoutStack(model.stackMarginals(state, ['cg', 'deemed'], 0), GDP0);
  const rows = buildStackCsv(layout, GDP0, DEC0_LABEL, {});
  const header = rows[0];
  const line = rows.slice(1).find((x) =>
    x[header.indexOf('policy')] === 'Whole package'
    && x[header.indexOf('stage')] === SCORE_RUNG.label
    && x[header.indexOf('scope')] === 'total');
  assert.ok(line, 'no whole-package collected total in the CSV');
  const csvValue = Number(line[header.indexOf('revenue_usd_billions')]);
  assert.ok(Math.abs(csvValue - r.actual) <= 1e-4 * Math.abs(r.actual),
    `CSV total ${csvValue} != model actual ${r.actual}`);
});

// ---- export image ---------------------------------------------------------

test('buildStackExportSvg: carries a title, the budget window, and each policy\'s settings', () => {
  const model = createModel(DATA);
  const state = { ord: { rate: 45 }, corp: { rate: 35 } };
  const layout = layoutStack(model.stackMarginals(state, ['ord', 'corp'], 0), GDP0);
  const svg = buildStackExportSvg(layout, GDP0, {
    decadeLabel: DEC0_LABEL, title: 'Revenue one policy at a time',
    dialSubtitles: { ord: 'top rate 45%', corp: 'rate 35%' }
  });
  assert.ok(svg.includes('Revenue one policy at a time'), 'figure title missing');
  assert.ok(svg.includes(DEC0_LABEL), 'budget window missing');
  assert.ok(svg.includes('top rate 45%') && svg.includes('rate 35%'), 'dial settings missing');
  // The wordmark carries the attribution now, as it does in the engine's own exports.
  assert.ok(svg.includes('data:image/svg+xml;base64,'), 'Budget Lab wordmark missing');
  assert.ok(/<image[^>]+x="810"/.test(svg), 'wordmark should sit top right, on the engine’s margin');
  // Mirrors the screen: all three rungs and both numeric columns.
  RUNGS.forEach((u) => assert.ok(svg.includes(u.tag), `rung tag ${u.tag} missing`));
  assert.ok(/\$\d/.test(svg) && /%/.test(svg), 'both dollar and share columns should be present');
});

test('buildStackExportSvg: the score rung is drawn at double thickness, as on screen', () => {
  const model = createModel(DATA);
  const layout = layoutStack(model.stackMarginals({ ord: { rate: 45 } }, ['ord'], 0), GDP0);
  const svg = buildStackExportSvg(layout, GDP0, EX_OPTS);
  // Bar rects carry a fractional width (toFixed(1)); the page background and the
  // legend swatches use integers, so this matches bars only.
  const heights = (svg.match(/width="[\d.]+\.\d" height="(\d+)" fill="/g) || [])
    .map((m) => Number(m.match(/height="(\d+)"/)[1]));
  assert.ok(heights.includes(SCORE_RUNG.h), `no bar drawn at the score thickness (${SCORE_RUNG.h})`);
  assert.ok(heights.includes(RUNGS[0].h), 'no bar drawn at the workings thickness');
});

// The engine's bar marks pass no rx, so a rounded bar here would read as a second
// chart language beside the engine-rendered distribution card. Gate it: the only
// rounded rect in the figure is the legend swatch, at the engine's own 1px.
test('bars are drawn with square corners, as the engine draws its own', () => {
  const model = createModel(DATA);
  const layout = layoutStack(model.stackMarginals({ ord: { rate: 45 }, corp: { rate: 35 } }, ['ord', 'corp'], 0), GDP0);
  const svg = buildStackExportSvg(layout, GDP0, EX_OPTS);
  const bars = svg.match(/<rect[^>]*width="[\d.]+\.\d"[^>]*\/>/g) || [];
  assert.ok(bars.length > 0, 'no bar rects found — the regex no longer matches the markup');
  bars.forEach((r) => assert.ok(!/\brx=/.test(r), `a bar rect carries a corner radius: ${r}`));
  assert.deepEqual([...new Set(svg.match(/\brx="[^"]+"/g) || [])], ['rx="1"'],
    'the legend swatch is the only rounded rect, and it matches the engine at 1px');
});

// ---- mechanism copy (render/stack-copy.js) ---------------------------------
// The prose layer keyed by policy x base x rung. Copy is verbatim from the
// reference prototype; what's tested is the SELECTION, which is ours.

test('whyCopy: the first-order rung names the policy\'s own base, and defers for a spillover base', () => {
  const gdp = 400000;
  const row = { key: 'corp', isTotal: false, stat: { corp: 100, iit: -5 }, mech: { corp: 100, iit: -9 }, conv: { corp: 90, iit: -2 } };
  const own = whyCopy(row, 'corp', 'stat', gdp);
  const spill = whyCopy(row, 'iit', 'stat', gdp);
  assert.match(own, /^Direct (impacts|revenues) from/,
    'own-base copy names the direct effect, not a spillover');
  assert.match(spill, /before any feedback/, 'a spillover base gets the generic first-order line');
  assert.notEqual(own, spill);
});

test('whyCopy: the mechanical rung gives the mechanical cause when the step is material', () => {
  const gdp = 400000;
  const row = { key: 'corp', isTotal: false, stat: { iit: 0 }, mech: { iit: -100 }, conv: { iit: -120 } };
  const copy = whyCopy(row, 'iit', 'mech', gdp);
  assert.match(copy, /against first order/);
  assert.match(copy, /after-tax rate of return in the corporate sector/,
    'should use the corp|iit mechanical sentence');
});

test('whyCopy: an immaterial mechanical step is reported as unchanged, not narrated', () => {
  const gdp = 400000;
  const row = { key: 'corp', isTotal: false, stat: { iit: 0 }, mech: { iit: -0.001 }, conv: { iit: -100 } };
  const copy = whyCopy(row, 'iit', 'mech', gdp);
  assert.match(copy, /Unchanged from first order/);
  assert.doesNotMatch(copy, /against first order/, 'must not claim a movement the numbers show as zero');
});

test('whyCopy: when neither step is material the collected rung says so instead of inventing a cause', () => {
  const gdp = 400000;
  const row = { key: 'corp', isTotal: false, stat: { iit: 0 }, mech: { iit: -0.001 }, conv: { iit: -0.002 } };
  assert.match(whyCopy(row, 'iit', 'conv', gdp), /Less than 0\.01% of GDP/);
});

test('whyCopy: the package row never claims a specific mechanism', () => {
  const gdp = 400000;
  const row = { key: null, isTotal: true, stat: { iit: 100 }, mech: { iit: 80 }, conv: { iit: 60 } };
  RUNGS.forEach((u) => {
    const copy = whyCopy(row, 'iit', u.k, gdp);
    assert.match(copy, /The total effect of the package as a whole/,
      `${u.k} rung should defer to the rows above`);
  });
});

test('whyCopy: the taxable max\'s behavioral steps print the number and no sentence', () => {
  const gdp = 400000;
  ['iit', 'corp', 'cg', 'pay'].forEach((h) => {
    const row = { key: 'taxmax', isTotal: false, stat: { [h]: 0 }, mech: { [h]: 0 }, conv: { [h]: 100 } };
    const copy = whyCopy(row, h, 'conv', gdp);
    assert.match(copy, /^<b>\+0\.03% against first order\.<\/b>$/, `${h}: got ${copy}`);
  });
  // The mechanical sentence on the same bar survives.
  const both = { key: 'taxmax', isTotal: false, stat: { iit: 0 }, mech: { iit: -100 }, conv: { iit: -60 } };
  assert.match(whyCopy(both, 'iit', 'conv', gdp), /lower wages, reducing taxable wages under the income tax\.$/);
});

test('whyCopy: every policy\'s own base has behavioral copy or is marked as having none', () => {
  Object.keys(SPILL_OWN).forEach((k) => SPILL_OWN[k].forEach((h) => {
    assert.ok(STEP_BEHAV_OWN[k] || NO_BEHAV_TEXT[k + '|' + h], `${k}|${h} would print "undefined"`);
  }));
});

test('whyCopy: gains at death -> estate carries the deduction on the first-order rung', () => {
  const gdp = 400000;
  const row = { key: 'deemed', isTotal: false, stat: { est: -40 }, mech: { est: -60 }, conv: { est: -60 } };
  assert.match(whyCopy(row, 'est', 'stat', gdp), /^The income tax triggered by the deemed realization is deductible/);
  assert.match(whyCopy(row, 'est', 'mech', gdp), /reducing the size of taxable estates at death\.$/,
    'the middle bar keeps the saving sentence');
});

test('whyCopy: the saving fallback is keyed on the base, not the policy row', () => {
  const gdp = 400000;
  const step = (key, h) => whyCopy({ key, isTotal: false, stat: { [h]: 0 }, mech: { [h]: -100 }, conv: { [h]: -100 } }, h, 'mech', gdp);
  assert.match(step('ord', 'wealth'), /reducing taxable wealth in the future\.$/);
  assert.match(step('wealth', 'est'), /reducing the size of taxable estates at death\.$/);
  assert.match(step('wealth', 'iit'), /reducing taxable investment flows in the future\.$/,
    'the wealth row\'s income-tax piece no longer claims taxable wealth');
  assert.match(step('wealth', 'cg'), /reducing taxable investment flows in the future\.$/);
});

test('isMaterial: the threshold is the 0.01% of GDP the rows print', () => {
  const gdp = 400000;
  assert.ok(isMaterial(0.005 / 100 * gdp, gdp), 'exactly at the threshold counts as material');
  assert.ok(!isMaterial(0.004 / 100 * gdp, gdp));
  assert.ok(isMaterial(-0.01 / 100 * gdp, gdp), 'materiality is on magnitude, not sign');
});

// ---- Task 11: render/export.js SVG serialization ----------------------------

test('standaloneSvgMarkup adds an xmlns when missing and wraps as a standalone document', () => {
  const raw = '<svg viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10"/></svg>';
  const out = standaloneSvgMarkup(raw);
  assert.ok(out.startsWith('<?xml'), 'should be prefixed with an XML declaration');
  assert.match(out, /<svg[^>]*\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(out.includes('<rect x="0" y="0" width="10" height="10"/>'), 'round-trips the inner markup unchanged');
});

test('standaloneSvgMarkup leaves an existing xmlns alone (no duplicate attribute)', () => {
  const raw = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 5"></svg>';
  const out = standaloneSvgMarkup(raw);
  const count = (out.match(/xmlns=/g) || []).length;
  assert.equal(count, 1);
});

test('standaloneSvgMarkup rejects an empty/non-string input', () => {
  assert.throws(() => standaloneSvgMarkup(''));
  assert.throws(() => standaloneSvgMarkup(null));
});

// ---- vendored engine hooks the distribution card overrides in CSS ----------
// Two behaviours the engine spec can't express are worked around in styles.css
// (see docs/engine-requests/stacked-tooltip-without-net-dot.md): the net dot is
// hidden while its tooltip is kept, and the tooltip's Total row is pulled to the
// top. Both key off engine-internal names and on the Total row being emitted
// last. A re-vendor that renames or reorders them would silently revert the
// design, so the hooks are pinned here against the vendored bundle itself.

test('the hatch and the segment gap are declared in the spec, not patched in CSS', () => {
  const bundle = readFileSync(new URL('../vendor/chart-engine/live.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const src = readFileSync(new URL('../render/distribution.js', import.meta.url), 'utf8');
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 44.8 } }, 0, 'expanded');

  assert.ok(bundle.includes('series_patterns'), 'vendored engine does not know series_patterns');
  assert.ok(bundle.includes('segmentGap'), 'vendored engine does not know barStack.segmentGap');

  ['context', 'new'].forEach((view) => {
    const { spec } = buildDistSpec(dist, view);
    // A matplotlib hatch character. The engine rejects an unrecognized value at load
    // rather than rendering flat, so a typo here fails loudly instead of silently.
    assert.equal(spec.series_patterns.lostToBehavior, '/',
      `${view} view no longer hatches the lost-to-behavior series`);
    assert.ok(spec.series_order.includes('lostToBehavior'),
      `lostToBehavior missing from ${view} — a texture reaching no mark is a load error`);
    // Matches the 1px inset render/stack.js gives its own segments.
    assert.equal(spec.barStack.segmentGap, 1, `${view} view lost its segment gap`);
  });

  // The rate view builds its own dumbbell spec. A texture there would be rejected at
  // load: series_patterns is for filled chart types only.
  assert.ok(!('series_patterns' in buildRateSpec(dist).spec),
    'the rate view must not declare a texture — a dumbbell is not a filled chart type');

  // Remnants of the retired workarounds: either would double the gap or paint a
  // second hatch over the engine's own.
  assert.ok(!/hatch-leakage/.test(html + css), 'the old hand-rolled hatch pattern is still wired up');
  assert.ok(!/#distChart rect\[data-series\][^}]*stroke:/.test(css),
    'the old background-colored segment stroke is still applied on top of segmentGap');
});

// The rate view was hand-rolled SVG until engine 1.11.0, because chartType:dumbbell
// landed in 1.7.0 — after the 1.4.1 pin it was built against. Its legend borrowed the
// engine's `.tbl-legend-swatch.is-dot` class, which 1.11.0 retired when every key
// moved to SVG, so the dots became squares. It is fully engine-mounted now.
test('the rate view is an engine dumbbell, not hand-rolled SVG', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 45 }, corp: { rate: 35 } }, 0, 'expanded');
  const { spec, rows } = buildRateSpec(dist);
  const src = readFileSync(new URL('../render/distribution.js', import.meta.url), 'utf8');

  assert.equal(spec.chartType, 'dumbbell');
  assert.equal(spec.orientation, 'vertical', 'groups run along x, rates up the value axis');
  assert.deepEqual(spec.series_order, DUMBBELL_MEASURES.map((m) => m.key));

  // The markers ARE the encoding: the pair sharing one hue is the plan's ask vs. what
  // it collects, so hollow-to-filled is the gap the figure is about.
  assert.deepEqual(spec.series_marker, {
    current_law: 'ink', static: 'hollow', collected: 'filled',
  });

  // Colours must be engine palette NAMES: 1.11.0 rejects a colour it cannot resolve,
  // and a var(--tbl-*) reference is unreadable to the resolver.
  Object.values(spec.series_colors).forEach((c) => {
    assert.ok(!/^var\(/.test(c), `series colour ${c} is a CSS var — 1.11.0 cannot resolve it`);
  });

  assert.equal(rows.length, Object.keys(dist).length * DUMBBELL_MEASURES.length);
  assert.deepEqual(spec.category_order, Object.keys(dist));
  assert.equal(spec.value_format.suffix, '%');

  // Nothing in this module should be drawing dumbbell marks or a legend any more.
  // Comment lines are stripped first: the module explains this history in prose, and
  // naming the retired class there must not read as still using it.
  const code = src.replace(/^\s*\/\/.*$/gm, '');
  ['function paneSvg', 'function legendHtml', 'function colorForMarker', 'tbl-legend-swatch']
    .forEach((dead) => assert.ok(!code.includes(dead), `hand-rolled dumbbell remnant: ${dead}`));
});

// The rate view keeps its own hover card CONTENT over the engine's marks: the engine's own
// dumbbell tooltip lists series values, where this figure leads with the pp change and names
// the denominator. Since 1.12.0 that content goes through hooks.tooltip, so the engine keeps
// hit-testing and positioning and nothing is suppressed.
test('the value axes carry their units', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 45 } }, 0, 'expanded');
  // value_prefix/value_suffix reach axis ticks, value labels and tooltips alike.
  ['context', 'new'].forEach((view) => {
    assert.equal(buildDistSpec(dist, view).spec.value_prefix, '$', `${view} axis lost its dollar sign`);
  });
  assert.equal(buildRateSpec(dist).spec.value_suffix, '%', 'the rate axis lost its percent sign');
});

test('groupThousands separates digit runs without touching category labels', () => {
  assert.equal(groupThousands('$15000'), '$15,000');
  assert.equal(groupThousands('-$5000'), '-$5,000', 'the prefix sits after the minus, and grouping follows');
  assert.equal(groupThousands('$1234567'), '$1,234,567');
  assert.equal(groupThousands('$500'), '$500', 'three digits take no separator');

  // Category labels reach the same axis text nodes; digits in them must survive intact.
  assert.equal(groupThousands('Top 10%'), 'Top 10%');
  assert.equal(groupThousands('35%'), '35%');
  assert.equal(groupThousands('Quintile 5'), 'Quintile 5');

  // Idempotent, which is what lets the pass re-run after an engine re-render.
  assert.equal(groupThousands('$15,000'), '$15,000');
  assert.equal(groupThousands(groupThousands('$20000')), '$20,000');
});

test('tickLabelHook reproduces the engine tick format, grouped', () => {
  const ctx = { axis: 'y', ticks: [0, 5000, 10000, 15000, 20000], affixes: { prefix: '$', suffix: '' } };
  assert.equal(tickLabelHook(15000, ctx), '$15,000');
  assert.equal(tickLabelHook(0, ctx), '$0');
  // The prefix sits inside the minus, as the engine's own applyValueAffixes does.
  assert.equal(tickLabelHook(-5000, ctx), '-$5,000');

  // maxFrac comes from the tick SET, the way makeTickFormatter derives it — so a
  // fractional tick set keeps its decimals on every tick, including whole ones.
  const frac = { axis: 'y', ticks: [0, 0.5, 1], affixes: { prefix: '', suffix: '%' } };
  assert.equal(tickLabelHook(0.5, frac), '0.5%');
  assert.equal(tickLabelHook(1, frac), '1.0%');

  // A percent axis with no four-digit run is untouched apart from its suffix.
  const pct = { axis: 'y', ticks: [5, 10, 35], affixes: { prefix: '', suffix: '%' } };
  assert.equal(tickLabelHook(35, pct), '35%');

  // null defers to the engine rather than printing something wrong.
  assert.equal(tickLabelHook(NaN, ctx), null);
});

test('distTipCfg leads with the group total and reads top-down like the stack', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 45 }, corp: { rate: 35 } }, 0, 'expanded');
  const group = Object.keys(dist)[0];
  const row = dist[group];

  const ctx = distTipCfg(group, row, 'context', 'expanded', 2027);
  assert.match(ctx.head, new RegExp('^' + group + ' ·'));
  // Both dollar views lead with the first-order estimate: the total income is the
  // figure's denominator, not its subject.
  assert.equal(ctx.sub, 'first-order estimate');
  // Four segments, top of the stack first — the card's own order, and the reverse
  // of the legend, which runs bottom-up the way the stack is built.
  assert.deepEqual(ctx.rows.map((r) => r.label),
    ['Lost to behavior (not collected)', 'New tax collected', 'Current-law tax', 'After-tax income']);
  assert.ok(ctx.rows.every((r) => /^−?\$/.test(r.value)), 'every row carries a dollar figure');

  // The 'new' view shows only the plan's own ask, and says so.
  const nu = distTipCfg(group, row, 'new', 'expanded', 2027);
  assert.equal(nu.sub, 'first-order estimate');
  assert.deepEqual(nu.rows.map((r) => r.label), ['Lost to behavior (not collected)', 'New tax collected']);

  // No palette NAME may leak into the card: the spec carries names for the engine to
  // resolve, the card needs CSS colours.
  [...ctx.rows, ...nu.rows].forEach((r) => {
    assert.ok(/^(var\(|#)/.test(r.color), `card swatch ${r.color} is not a CSS colour`);
  });

  assert.equal(distTipCfg(group, row, 'context', 'hs', 2027).meta, '2027 · accrual income');
});

test('rateTipCfg leads with the pp change and keys each rate to its own marker', () => {
  const cfg = rateTipCfg('Top 1%', { current_law: 26.4, static: 33.8, collected: 31.2 }, 'expanded', 2027);

  assert.match(cfg.head, /^Top 1% ·/);
  assert.equal(cfg.meta, '2027 · cash income');
  assert.equal(cfg.amount, '+4.8 pp', 'hero is collected minus current law, one decimal');
  assert.equal(cfg.glyph, '▴', 'a rise gets an up caret');

  // The hollow row is the ask; only it rings. Keying all three the same would key two
  // different marks identically. The fourth row is DERIVED (the behavioral gap), so it
  // keys nothing and rings nothing.
  assert.deepEqual(cfg.rows.map((r) => !!r.hollow), [false, true, false, false]);
  // No explicit plus: the ordinary case is a loss, so a bare number means one.
  assert.deepEqual(cfg.rows.map((r) => r.value), ['26.4%', '33.8%', '31.2%', '2.6 pp']);

  // One label per concept, shared with the legend so the two cannot drift. "Rate" is
  // not repeated on any row: the head, the axis title and the % all say it already.
  assert.deepEqual(cfg.rows.map((r) => r.label),
    ['Current law', 'First-order', 'Collected', 'Lost to behavior (not collected)']);
  assert.deepEqual(DUMBBELL_MEASURES.map((m) => m.label), ['Current law', 'First-order', 'Collected']);

  // 33.8 - 31.2 = 2.6 pp asked for and not collected — now the row above, not prose.
  assert.match(cfg.note, /cash income/);
  assert.ok(!/2\.6 pp/.test(cfg.note), 'the note must not restate a number the rows print');
});

// The identity line ("new taxes + lost to behavior = first-order estimate") is a
// SPEC field, not a DOM injection. It was injected with insertAdjacentHTML after
// the mount, which put it below the whole figure instead of in the engine's own
// note slot AND left it out of every downloaded PNG — the export re-renders from
// the spec and never sees the live DOM. Pinned here because the failure is
// silent: the page looks right and only the image is wrong.
test('the identity note rides on the spec, so the PNG export carries it too', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 45 } }, 0, 'expanded');
  ['context', 'new'].forEach((view) => {
    assert.match(buildDistSpec(dist, view).spec.note,
      /new taxes actually collected plus taxes lost to behavior/);
  });
  assert.equal(buildRateSpec(dist).spec.note, undefined, 'the rate view carries no caption');

  const src = readFileSync(new URL('../render/distribution.js', import.meta.url), 'utf8');
  assert.ok(!/insertAdjacentHTML/.test(src),
    'chrome injected into the DOM after the mount cannot reach the PNG export');
});

test('hover chrome is configured in the spec, not suppressed in CSS', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const src = readFileSync(new URL('../render/distribution.js', import.meta.url), 'utf8');
  const bundle = readFileSync(new URL('../vendor/chart-engine/live.js', import.meta.url), 'utf8');
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 45 } }, 0, 'expanded');

  // A stacked chart draws no hover card unless asked: an all-positive stack hovers with
  // per-segment pills, and hooks.tooltip would have nothing to replace.
  ['context', 'new'].forEach((view) => {
    const { spec } = buildDistSpec(dist, view);
    assert.equal(spec.barStack.hover, 'tooltip', `${view} view would draw no card to hook`);
    assert.equal(spec.barStack.netDisplay, 'none', 'the net dot must stay out of the export');
    assert.equal(spec.chrome.valuePills, false, `${view} pills would repeat the card`);
  });
  assert.equal(buildRateSpec(dist).spec.chrome.valuePills, false);

  // The engine understands both keys at this pin.
  assert.ok(bundle.includes('valuePills'), 'vendored engine does not know chrome.valuePills');

  // Nothing is suppressed from the stylesheet any more, and no override remains.
  assert.ok(!/own-card|tbl-hl-pills|tbl-coord|tbl-net-marker|__total__/.test(css),
    'a retired engine-internals override is still in the stylesheet');

  // The card is authored through the engine's hook, not a hand-rolled hit-test.
  assert.ok(/hooks:\s*\{/.test(src) && /tooltip: tooltipHookFor/.test(src),
    'the hover card must be wired through hooks.tooltip');
  // Comment lines stripped: the module explains the retired hit-test in prose, and naming
  // it there must not read as still doing it.
  const code = src.replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/data-category/.test(code),
    'hand-rolled category hit-testing should be gone — the engine resolves it now');
});

test('rateTipCfg: a change that rounds to zero gets no caret, and a flat gap is stated as such', () => {
  const flat = rateTipCfg('Quintile 1', { current_law: 4.0, static: 4.02, collected: 4.0 }, 'hs', 2027);
  assert.equal(flat.glyph, '', 'a 0.0 pp change must not point a caret at nothing');
  // Same rule on the derived row: a gap that rounds away prints unsigned.
  assert.equal(flat.rows[3].value, '0.0 pp');
  assert.match(flat.note, /accrual \(i\.e\., Haig-Simons\)/, 'the accrual denominator is spelled out');
});

// A stray `*/` or an unopened block silently kills every rule after it, and no
// other test reads this file as CSS.
// Codex review, 2026-08-21: the tool no longer OVERRIDES engine internals, but it still
// DEPENDS on engine class names, and none of them was pinned — the exact shape of the
// 1.11.0 break where a retired swatch class silently rendered squares.
//   1. It suppresses the engine's own titlebar/subtitle inside #distChart, because the card
//      renders its own header. If those classes move, the page shows both.
//   2. tipCard emits the engine's tooltip classes so the tool's card is styled by the
//      vendored stylesheet and looks native in both hosts. If those move, both figures'
//      cards lose their layout and swatches.
//   3. index.html titles BOTH cards with the engine's own header classes, and stack.js
//      builds its download control out of the engine's own download markup. Neither has a
//      rule of its own here beyond a nudge, so if the engine drops either set the headers
//      and the download buttons lose their styling with no error.
// The class list below is curated, not derived: .figure-cap and .figure-description are the
// tool's own inventions and the engine never defines them.
test('the engine classes the tool depends on still exist in the vendored stylesheet', () => {
  const engineCss = readFileSync(new URL('../vendor/chart-engine/chart-engine.css', import.meta.url), 'utf8');
  const ourCss = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const card = tipCard({ head: 'H', meta: 'm', amount: '1', rows: [{ label: 'L', value: 'V' }], note: 'n' });

  // Both stylesheets must still carry each class as a selector. Matched with a trailing
  // boundary so .figure-titlebar cannot stand in for a dropped .figure-title, and
  // .figure-meta-text cannot stand in for a dropped .figure-meta.
  const defines = (css, cls) => new RegExp(`\\.${cls}(?![\\w-])`).test(css);
  [
    ['figure-titlebar', 'suppressed inside #distChart — the card draws its own header'],
    ['figure-subtitle', 'suppressed inside #distChart — the card draws its own header'],
    ['figure-card', "the engine's card margin is zeroed inside our wrapper"],
    ['figure-supertitle', "index.html titles both cards with the engine's header classes"],
    ['figure-title', "index.html titles both cards with the engine's header classes"],
    ['figure-meta', "stack.js builds its download control from the engine's markup"],
    ['figure-meta-text', "stack.js builds its download control from the engine's markup"],
    ['figure-downloads', "stack.js builds its download control from the engine's markup"],
    ['figure-download-btn', "stack.js builds its download control from the engine's markup"]
  ].forEach(([cls, why]) => {
    assert.ok(defines(ourCss, cls), `styles.css no longer targets .${cls} — ${why}; is that dependency gone?`);
    assert.ok(defines(engineCss, cls), `engine no longer defines .${cls} — ${why}, and it will now render unstyled`);
  });

  // Every engine class the card emits must still be styled by the engine.
  const emitted = [...card.matchAll(/class="([^"]+)"/g)]
    .flatMap((m) => m[1].split(/\s+/))
    .filter((c) => c.startsWith('tbl-'));
  assert.ok(emitted.length > 0, 'tipCard emits no engine classes — did the card stop reusing them?');
  [...new Set(emitted)].forEach((cls) => {
    assert.ok(engineCss.includes(cls), `engine no longer defines .${cls}, which tipCard emits`);
  });
});

// A card row must key the mark it names. The engine draws that key as SVG — a hatch glyph,
// a hollow ring, a circle, a rect — and hands hooks.tooltip its own card in ctx.rendered. The
// first version of this hook threw those away and drew a CSS-coloured box, so the hatch
// flattened to its ground colour and every dumbbell circle rendered as a square.
test('engineSwatches lifts the engine key per series, in order, skipping the Total row', () => {
  const row = (cls, inner) => `<div class="tbl-tooltip-row${cls}"><span class="tbl-tooltip-swatch">${inner}</span><span><span class="tbl-tooltip-label">L:</span></span></div>`;
  const rendered = '<div class="tbl-tooltip-head">Q1</div>'
    + row('', '<svg><rect/><line/></svg>')
    + row('', '<svg><rect/></svg>')
    + row(' tbl-tooltip-row--total tbl-tooltip-row--total-bold', '');

  const out = engineSwatches(rendered, ['lostToBehavior', 'collectedNew']);
  assert.deepEqual(Object.keys(out), ['lostToBehavior', 'collectedNew']);
  assert.match(out.lostToBehavior, /<line\/>/, 'the hatch glyph must survive');
  assert.ok(!/<line\/>/.test(out.collectedNew), 'a flat series must not inherit the hatch');
  // The Total row's swatch is a deliberate empty spacer and keys no series.
  assert.equal(Object.keys(out).length, 2);

  assert.deepEqual(engineSwatches('', ['a']), {});
  assert.deepEqual(engineSwatches(rendered, []), {});
});

test('both cards use the engine key when given one, and fall back to a colour when not', () => {
  const model = createModel(DATA);
  const dist = model.computeDistribution({ ord: { rate: 45 } }, 0, 'expanded');
  const group = Object.keys(dist)[0];
  const KEY = '<span class="tbl-tooltip-swatch"><svg><rect/><line/></svg></span>';

  const withKeys = distTipCfg(group, dist[group], 'new', 'expanded', 2027, { lostToBehavior: KEY });
  assert.equal(withKeys.rows.find((r) => r.label === 'Lost to behavior (not collected)').swatch, KEY);
  assert.ok(tipCard(withKeys).includes(KEY), 'tipCard must emit the engine key verbatim');
  assert.ok(!/tbl-tooltip-swatch" style=/.test(tipCard(withKeys).split(KEY)[0]),
    'the keyed row must not also draw a CSS box');

  // No keys (e.g. a card built outside a render): the colour path still produces a swatch.
  const bare = distTipCfg(group, dist[group], 'new', 'expanded', 2027);
  assert.ok(bare.rows.every((r) => !r.swatch));
  assert.ok(/tbl-tooltip-swatch" style=/.test(tipCard(bare)), 'fallback swatch missing');

  // The rate view keys three circles, the middle one hollow. The fourth row is a
  // DERIVED value, not a mark, so it takes no key at all — a swatch there would
  // send the reader looking for a mark that is not on the chart.
  const rate = rateTipCfg('Top 1%', { current_law: 26.4, static: 33.8, collected: 31.2 }, 'expanded', 2027,
    { current_law: 'A', static: 'B', collected: 'C' });
  assert.deepEqual(rate.rows.map((r) => r.swatch), ['A', 'B', 'C', undefined]);
  assert.ok(tipCard(rate).includes('tbl-tooltip-swatch is-blank'), 'derived row holds an empty swatch slot');
});

test('styles.css comment blocks are balanced', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.equal((css.match(/\/\*/g) || []).length, (css.match(/\*\//g) || []).length,
    'unbalanced /* */ in styles.css — rules after the break are dead');

  // Counting markers alone misses the likelier slip: prose appended AFTER a block's
  // closing */, which leaves the totals even but drops raw text into the stylesheet.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!stripped.includes('*/'), 'stray */ outside a comment block in styles.css');
  // A `*`-led line that opens no rule and ends no selector list is prose, not the
  // universal selector (`* { … }`, `*,`).
  const orphan = stripped.split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('*') && !line.includes('{') && !line.endsWith(','));
  assert.equal(orphan, undefined, `comment-style line outside a comment block: ${orphan}`);
});

// ---- Task 12: typography guard (no source-style mono copying) -------------
// The vendored chart engine (vendor/chart-engine/chart-engine.css) never uses
// --tbl-font-mono anywhere — every text element, including numeric table
// cells and tick labels, renders in --tbl-font-sans. Overusing mono
// throughout this tool's own chrome/SVG text was a carry-over of the
// ORIGINAL source's visual style (flagged in Phase-2 dial-in item 6), not a
// Budget Lab convention. This is a static-source grep guard, not a rendered-
// DOM check (no browser/jsdom in this test env) — it pins the source text so
// a --tbl-font-mono reference or a bare 'monospace' literal can't silently
// creep back into styles.css or the tool's SVG-emitting JS.
test('no --tbl-font-mono token or bare monospace literal remains in the tool\'s own CSS/JS', () => {
  const toolRoot = new URL('../', import.meta.url);
  const files = [
    'styles.css', 'index.html', 'app.js',
    'render/shared.js', 'render/stack.js', 'render/stack-copy.js', 'render/distribution.js', 'render/export.js'
  ];
  files.forEach((rel) => {
    const src = readFileSync(new URL(rel, toolRoot), 'utf8');
    assert.ok(!src.includes('--tbl-font-mono'), `${rel} still references --tbl-font-mono`);
    assert.ok(!/['"]monospace['"]/.test(src), `${rel} still has a bare 'monospace' font-family literal`);
  });
});

// ---- lever infoboxes --------------------------------------------------------
// The "?" beside each policy control, after the Small Macro Model's preset_row
// pattern. Pure builders, so the button semantics and the aria wiring are
// assertable with no DOM — the same reason render/stack.js exports gripHtml.
// The TEXT is not written yet; these pin the mechanism so the copy can be
// dropped into LEVER_INFO without touching anything structural.
test('leverInfoBtn: a real button, named for its policy', () => {
  const btn = leverInfoBtn({ key: 'ord', label: 'Top ordinary rate' });
  assert.match(btn, /<button type="button"/);
  assert.match(btn, /aria-label="About Top ordinary rate"/, 'a bare "?" names nothing to a screen reader');
  assert.match(btn, /data-info="ord"/, 'the handler finds its lever by this attribute');
  assert.match(btn, /aria-expanded="false"/, 'starts closed; app.js flips it when the tip opens');
});

// The "?" sits INSIDE the pill, next to the policy name. That is only legal because
// the pill is a <div> carrying the click handler and the toggle inside it is the
// real button — a <button> may not contain another button. If the pill ever goes
// back to being a <button>, this is the test that should stop it.
test('the switch pill is a div, so the "?" inside it is valid', () => {
  const src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(src, /createElement\('div'\); b2\.className = 'sw'/,
    'the pill must not be a <button>: it contains the "?" button');
  assert.match(src, /class="dot" aria-pressed=/,
    'the toggle inside the pill is the real control and carries the pressed state');
});

test('every lever has real info copy, not the placeholder', () => {
  const keys = DATA.meta.levers.map((l) => l.key);
  // The copy landed in the August 2026 review round, so the placeholder is now
  // a defect rather than an expected state: a lever added to data.json without
  // a LEVER_INFO entry fails here instead of shipping "Description to come."
  const blank = keys.filter((k) => leverInfoText(k) === 'Description to come.');
  assert.deepEqual(blank, [], `these levers have no info copy: ${blank.join(', ')}`);
  keys.forEach((k) => {
    assert.ok(leverInfoText(k).length > 20, `${k} info copy looks truncated`);
  });
});

test('lever info escapes its inputs', () => {
  const nasty = { key: 'x"y', label: 'A & B "quoted" <tag>' };
  const btn = leverInfoBtn(nasty);
  assert.ok(!/aria-label="About A & B "quoted"/.test(btn), 'an unescaped quote breaks out of the attribute');
  assert.match(btn, /&amp;/, 'the ampersand in a policy name must be escaped');
  assert.match(btn, /data-info="x&quot;y"/, 'the key is escaped, not passed through raw');
  assert.ok(!/<tag>/.test(btn), 'a tag in a policy name must not reach the markup');
});

// Gains at death carries BOTH a toggle and its three-way selector, and they are two
// views of one state: off means the lever contributes nothing, which for this policy
// is step-up — current law. Turning off CLEARS the choice rather than remembering it,
// so turning back on lands on the default. An earlier version of this test asserted a
// "restores your last choice" behaviour the code never had and that the UI could not
// reach — the position is parked at `off` on the way out, and kept nowhere else.
test('ladderPosOnToggle: on opens at current law, off reverts to it', () => {
  const OFF = 'off';
  // Turning on leaves the position alone. It is already current law, so the lever
  // opens producing no change — like a rate lever opening with its dial at law.
  assert.equal(ladderPosOnToggle(true, OFF, OFF), OFF);
  assert.equal(ladderPosOnToggle(true, 'carryover', OFF), 'carryover');
  // Turning off reverts, so nothing a reader set leaks back in on the way up.
  assert.equal(ladderPosOnToggle(false, 'carryover', OFF), OFF);
  assert.equal(ladderPosOnToggle(false, 'deemed', OFF), OFF);
  // Round trip lands at current law, never at a departure the reader did not pick.
  assert.equal(ladderPosOnToggle(true, ladderPosOnToggle(false, 'deemed', OFF), OFF), OFF);
});

// A ladder's position axis starts at CURRENT LAW, the same way a rate dial does.
// It used to start at the reference position, so switching the lever on silently
// applied a policy the reader had not chosen.
test('initState opens a ladder at its current-law position', () => {
  const levers = DATA.meta.levers;
  const st = initState(levers);
  const ladder = levers.find((l) => l.interp === 'ladder' || l.interp === 'ladder_x');
  assert.ok(ladder, 'fixture must contain a ladder lever');
  const posParam = ladder.params.find((p) => p.fmt === 'pos');
  assert.equal(st[ladder.key].vals[posParam.key], posParam.off,
    'a ladder must open at current law, not at its reference position');
  assert.equal(st[ladder.key].on, false);

  // A binary lever is different: its off state IS the switch, so it keeps the
  // on-position value and must NOT be dragged to its off value here.
  const binary = levers.find((l) => l.kind === 'binary');
  if (binary) {
    const bp = binary.params[0];
    assert.equal(st[binary.key].vals[bp.key], bp.ref,
      'a binary lever still carries its on-position value');
  }
});

// Selecting step-up is a setting, not a second off switch: the lever stays on and
// scores zero, exactly as a wealth tax set to 0% does.
test('picking a position never switches the lever off', () => {
  const src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const start = src.indexOf('positions.forEach');
  const end = src.indexOf('xdials.appendChild(seg)', start);
  assert.ok(start >= 0 && end > start, 'both markers bounding the position handler must exist');
  const seg = src.slice(start, end);
  assert.match(seg, /state\[l\.key\]\.on = true;/,
    'a position click must set on = true unconditionally');
  assert.ok(!/state\[l\.key\]\.on = \(pos !== offVal\)/.test(seg),
    'step-up must not close the control');
});

// The tooltip is a single element on <body>, so the ONLY thing tying it to the button
// a reader is on is aria-describedby. Without it a screen-reader user activates the
// trigger and hears nothing new.
test('the open explainer is announced: describedby is set and cleared', () => {
  const src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(src, /setAttribute\('aria-describedby', tip\.id\)/,
    'the open trigger must point at the tooltip');
  assert.match(src, /removeAttribute\('aria-describedby'\)/,
    'and must stop pointing at it when closed, or every trigger accumulates one');
});

// renderControls() replaces every node in the rail on any state change, so an open
// tooltip outlives its trigger. syncLeverTip re-opens it against the new node.
test('an open explainer survives a rail re-render in step with its trigger', () => {
  const src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(src, /function syncLeverTip\(\)/);
  assert.match(src, /syncLeverTip\(\);/, 'renderControls must call it after rebuilding the rail');
});
