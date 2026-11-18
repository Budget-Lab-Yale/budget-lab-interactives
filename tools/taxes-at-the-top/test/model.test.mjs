import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel } from '../model.js';
const DATA = JSON.parse(readFileSync(new URL('../data/data.json', import.meta.url)));
const model = createModel(DATA);

// Held-out validation set: DATA.meta.surrogate.checks (31 = 21 quiz + 10 corners).
// Each check's state lists only the active levers. evalQ('ct'|'st', state)[d] must
// reproduce conv/static totals within the surrogate's PUBLISHED per-decade error
// bounds (meta.surrogate.validation.bounds_pct / static_bounds_pct), with a small
// float-safety margin. A transcription bug blows well past these tight bounds.
const V = DATA.meta.surrogate.validation;
const CONV_TOL = V.bounds_pct.map(p => p / 100 * 1.05);          // e.g. [3.7,4.5,4.9]% → fractions
const STAT_TOL = V.static_bounds_pct.map(p => p / 100 * 1.05);   // e.g. [1.8,1.1,0.6]%

// The exclusion sub-axis is only exercised by checks whose state sets it, and
// only the off-anchor values reach exemInterp's interpolation branch at all
// (an exact $1M/$5M state hits a measured anchor). Assert the fixture set
// still covers both, so a future vintage that dropped those checks can't
// quietly leave ladderRatio/exemInterp untested by the loop above.
const EXEM_CHECKS = DATA.meta.surrogate.checks.filter(c => (c.state.deemed || {}).exem > 0);
test('the holdout set still exercises the exclusion axis, including off-anchor values', () => {
  assert.ok(EXEM_CHECKS.length >= 4, `expected several checks with a nonzero exclusion, got ${EXEM_CHECKS.length}`);
  const anchors = DATA.meta.levers.find(l => l.key === 'deemed').params[1].knots;
  const offAnchor = EXEM_CHECKS.filter(c => !anchors.includes(c.state.deemed.exem));
  assert.ok(offAnchor.length > 0, 'no check sets an exclusion between the measured anchors');
});
for (const c of DATA.meta.surrogate.checks) {
  test(`check ${c.id}: behavioral + static totals within published per-decade bounds`, () => {
    const ct = model.evalQ('ct', c.state);
    const st = model.evalQ('st', c.state);
    for (let d = 0; d < 3; d++) {
      const relC = Math.abs(ct[d] - c.conv_totals[d]) / Math.abs(c.conv_totals[d]);
      const relS = Math.abs(st[d] - c.static_totals[d]) / Math.abs(c.static_totals[d]);
      assert.ok(relC <= CONV_TOL[d], `${c.id} conv d${d}: got ${ct[d]}, want ${c.conv_totals[d]} (rel ${relC} > ${CONV_TOL[d]})`);
      assert.ok(relS <= STAT_TOL[d], `${c.id} static d${d}: got ${st[d]}, want ${c.static_totals[d]} (rel ${relS} > ${STAT_TOL[d]})`);
    }
  });
}

// Shapley sum-identity: solo + 1/2*pair + 1/3*triple attributed back to
// members is an exact algebraic reconstruction of the total (not an
// interpolation-bound estimate), so it holds to float precision — a wrong
// coefficient breaks it by far more than 1e-6.
function closeEnough(a, b, tol) {
  return Math.abs(a - b) <= Math.max(tol, tol * Math.abs(b));
}
const SHAPLEY_TOL = 1e-6;
for (const c of DATA.meta.surrogate.checks) {
  test(`check ${c.id}: shapley sums to the behavioral total per decade`, () => {
    const ct = model.evalQ('ct', c.state);
    for (let d = 0; d < 3; d++) {
      const phi = model.shapley(c.state, d);
      const sum = Object.values(phi).reduce((a, b) => a + b, 0);
      assert.ok(
        closeEnough(sum, ct[d], SHAPLEY_TOL),
        `${c.id} d${d}: shapley sum ${sum} !== evalQ total ${ct[d]}`
      );
    }
  });
}

// Static-Shapley sum-identity: same exact algebraic reconstruction as the
// behavioral identity above, but for qid='st' — this is what render/stack.js
// uses so the stack view's static bars sum to results.comboStatic. Several
// checks (e.g. pc_cgr50_deemed) carry sizeable nonzero static pair
// interactions, so this also exercises the interaction-term half/third
// weighting, not just the solo term.
for (const c of DATA.meta.surrogate.checks) {
  test(`check ${c.id}: static shapley sums to the static total per decade`, () => {
    const st = model.evalQ('st', c.state);
    for (let d = 0; d < 3; d++) {
      const phiStatic = model.shapley(c.state, d, 'st');
      const sum = Object.values(phiStatic).reduce((a, b) => a + b, 0);
      assert.ok(
        closeEnough(sum, st[d], SHAPLEY_TOL),
        `${c.id} d${d}: static shapley sum ${sum} !== evalQ static total ${st[d]}`
      );
    }
  });
}

// ETR series shape: every head's array must line up 1:1 with meta.PCTS
// (the filtered, no-"Negative income" group list), for both income
// definitions, and a null delta must reproduce the baseline exactly.
const ETR_SAMPLE_STATE = { ord: { rate: 44.8 } };
for (const incdef of DATA.meta.etr_income_defs) {
  test(`etrBaseSeries('${incdef}') arrays line up with meta.PCTS`, () => {
    const base = model.etrBaseSeries(incdef);
    assert.ok(Object.keys(base).length > 0);
    for (const [head, arr] of Object.entries(base)) {
      assert.equal(arr.length, model.meta.PCTS.length, `head ${head} length mismatch`);
    }
  });
  test(`etrSeries(null, '${incdef}') deep-equals etrBaseSeries('${incdef}')`, () => {
    const base = model.etrBaseSeries(incdef);
    const nullDelta = model.etrSeries(null, incdef);
    assert.deepEqual(nullDelta, base);
  });
}
test('etrSeries with an active delta still lines up with meta.PCTS (both income defs)', () => {
  for (const incdef of DATA.meta.etr_income_defs) {
    const etrDelta = model.evalQ('etr', ETR_SAMPLE_STATE);
    const ser = model.etrSeries(etrDelta, incdef);
    for (const [head, arr] of Object.entries(ser)) {
      assert.equal(arr.length, model.meta.PCTS.length, `head ${head} length mismatch for ${incdef}`);
    }
  }
});

// ---- computeDistribution: dollar composition + rate triple, per group ---- //
// pc_cgr50_deemed pairs a realization-sensitive cg rate hike with the deemed-
// realization ladder position, so static and collected diverge for the top
// groups (nonzero lostToBehavior) — a real check from meta.surrogate.checks,
// not a synthetic state.
const DIST_CHECK = DATA.meta.surrogate.checks.find(c => c.id === 'pc_cgr50_deemed');
const DIST_DEC = 0;
for (const incdef of DATA.meta.etr_income_defs) {
  test(`computeDistribution reconciles dollars and rates for '${incdef}' (behavioral state)`, () => {
    const dist = model.computeDistribution(DIST_CHECK.state, DIST_DEC, incdef);
    const results = model.computeResults(DIST_CHECK.state, DIST_DEC, incdef);
    const incomeLevels = DATA.income_levels[incdef];
    const taxVec = model.evalQ('tax', DIST_CHECK.state), taxcVec = model.evalQ('taxc', DIST_CHECK.state);

    let sawNonzeroLeakage = false;
    model.meta.PCTS.forEach((g, i) => {
      const row = dist[g];
      assert.ok(row, `missing distribution row for group ${g}`);

      // dollar reconciliation
      // NOTE: these two identities hold BY CONSTRUCTION (lostToBehavior :=
      // staticNew - collectedNew, afterTaxIncome := income - currentLawTax -
      // staticNew), so they can't catch a /100-scaling or sign bug in the
      // dollar fields — they only confirm internal self-consistency. The
      // re-derivation assertions below (independently reapplying rate/100*
      // income from the row's own rate+income fields) are what actually
      // discriminate a scaling/sign regression.
      assert.ok(
        closeEnough2(row.collectedNew + row.lostToBehavior, row.staticNew, 1e-6),
        `${incdef}/${g}: collectedNew(${row.collectedNew}) + lostToBehavior(${row.lostToBehavior}) != staticNew(${row.staticNew})`
      );
      assert.ok(
        closeEnough2(row.afterTaxIncome + row.currentLawTax + row.staticNew, row.income, 1e-6),
        `${incdef}/${g}: afterTaxIncome + currentLawTax + staticNew != income`
      );
      assert.equal(row.income, incomeLevels[g], `${incdef}/${g}: income mismatch vs DATA.income_levels`);
      if (Math.abs(row.lostToBehavior) > 1e-9) sawNonzeroLeakage = true;

      // Independent re-derivation of the dollar fields (not from
      // computeDistribution's internals): this is what actually catches a
      // dropped /100, a flipped sign or a mis-indexed slice, since the expected
      // value here is computed fresh in the test. Current-law tax is the
      // current-law rate on current-law income; the new taxes are the summed
      // 'tax'/'taxc' components for this group. Reform-world rates are NOT
      // converted back to dollars: each is divided by its own world's income.
      assert.ok(
        closeEnough2(row.currentLawTax, row.rateCurrentLaw / 100 * row.income, 1e-6),
        `${incdef}/${g}: currentLawTax(${row.currentLawTax}) != rateCurrentLaw/100*income(${row.rateCurrentLaw / 100 * row.income})`
      );
      assert.ok(
        closeEnough2(row.staticNew, sliceSum(taxVec, incdef, g), 1e-6),
        `${incdef}/${g}: staticNew(${row.staticNew}) != summed tax components(${sliceSum(taxVec, incdef, g)})`
      );
      assert.ok(
        closeEnough2(row.collectedNew, sliceSum(taxcVec, incdef, g), 1e-6),
        `${incdef}/${g}: collectedNew(${row.collectedNew}) != summed taxc components(${sliceSum(taxcVec, incdef, g)})`
      );

      // rate triple == summed per-head rates from the same etr series computeResults already produces
      const sumHeads = (ser) => Object.keys(ser).reduce((t, k) => t + ser[k][i], 0);
      assert.ok(closeEnough2(row.rateCurrentLaw, sumHeads(results.etr.baseline), 1e-9), `${incdef}/${g}: rateCurrentLaw`);
      assert.ok(closeEnough2(row.rateStatic, sumHeads(results.etr.static), 1e-9), `${incdef}/${g}: rateStatic`);
      assert.ok(closeEnough2(row.rateCollected, sumHeads(results.etr.conv), 1e-9), `${incdef}/${g}: rateCollected`);
    });
    assert.ok(sawNonzeroLeakage, `expected at least one group with lostToBehavior != 0 for ${incdef}`);
  });
}

// Group g's slice of a tax/taxc vector, summed over components. Same
// income-def x group x component layout as etr.
function sliceSum(vec, incdef, g) {
  const G = DATA.meta.etr_groups, NC = DATA.meta.etr_comps.length;
  const off = (DATA.meta.etr_income_defs.indexOf(incdef) * G.length + G.indexOf(g)) * NC;
  let t = 0;
  for (let c = 0; c < NC; c++) t += vec[off + c];
  return t;
}

// The quintiles partition every household, so the reform's new tax summed
// over them is the same dollars whichever income definition ranks them. The
// 2026-09-28 vintage broke this on cash income (rate x current-law income,
// where the rate's denominator was the reform world's income): $170B collected
// against $55B on accrual for a 40% capital gains rate. Every held-out state.
test('new-tax dollars summed over quintiles agree across income definitions', () => {
  const QUINTILES = model.meta.PCTS.filter((g) => g.startsWith('Quintile'));
  assert.equal(QUINTILES.length, 5);
  DATA.meta.surrogate.checks.forEach((c) => {
    const [a, b] = DATA.meta.etr_income_defs.map((idf) => {
      const d = model.computeDistribution(c.state, 0, idf);
      return QUINTILES.reduce((t, g) => ({ s: t.s + d[g].staticNew, c: t.c + d[g].collectedNew }), { s: 0, c: 0 });
    });
    assert.ok(closeEnough2(a.s, b.s, 1e-6), `${c.id}: first-order ${a.s} vs ${b.s}`);
    assert.ok(closeEnough2(a.c, b.c, 1e-6), `${c.id}: collected ${a.c} vs ${b.c}`);
  });
});

// Absolute regression anchor: two hand-computed dollar figures for
// pc_cgr50_deemed/'hs', pinned so a future refactor that silently changes
// scaling (e.g. drops the /100, or swaps which side of the diff is negated)
// fails even if it happens to preserve the reconciliation identities above.
// Values below were computed by this same computeDistribution call before
// being pinned. Re-pinned for the 2026-10-01 refit of vintage
// toptax_v11_2026-09-28 (the baseline changed: VAT, "other" and the
// "Negative income" group were dropped; new taxes now read from tax/taxc):
//   Quintile 1: rateCurrentLaw=7.985%, income=$601.016B -> currentLawTax = 7.985/100*601.016
//   Top 0.1%:   staticNew=$272.774B (summed tax), collectedNew=$155.725B (summed taxc)
//               -> lostToBehavior = staticNew - collectedNew
test(`computeDistribution pins absolute dollar figures for 'hs' (pc_cgr50_deemed)`, () => {
  const dist = model.computeDistribution(DIST_CHECK.state, DIST_DEC, 'hs');
  assert.ok(
    closeEnough2(dist['Quintile 1'].currentLawTax, 47.9911276, 1e-6),
    `Quintile 1 currentLawTax drifted: got ${dist['Quintile 1'].currentLawTax}`
  );
  assert.ok(
    closeEnough2(dist['Top 0.1%'].lostToBehavior, 117.04936064099996, 1e-6),
    `Top 0.1% lostToBehavior drifted: got ${dist['Top 0.1%'].lostToBehavior}`
  );
});

function closeEnough2(a, b, tol) {
  return Math.abs(a - b) <= Math.max(tol, tol * Math.abs(b));
}

// ---- Task 17: stackMarginals — order-dependent per-head marginal waterfall ----
// Restores the prototype's renderMarginals (scratchpad/handoff/simulator.html:
// 1098-1170): each row is a lever's MARGINAL contribution given the levers
// above it in `order`, split by tax head, computed via prefix evalQ('ch'/'sh')
// — deliberately order-DEPENDENT (unlike model.shapley above), but always
// telescoping to the same whole-package total for any order.

const MULTI_STATE = { ord: { rate: 44.8 }, cg: { rate: 30 }, corp: { rate: 28 } };
const MULTI_ORDER = ['ord', 'cg', 'corp'];

test('stackMarginals: rows TELESCOPE to pkg per head (conv and stat) for a multi-lever state', () => {
  const { rows, pkg } = model.stackMarginals(MULTI_STATE, MULTI_ORDER, 0);
  model.meta.HEADS_ORDER.forEach((hk) => {
    const sumConv = rows.reduce((t, r) => t + (r.conv[hk] || 0), 0);
    const sumStat = rows.reduce((t, r) => t + (r.stat[hk] || 0), 0);
    assert.ok(closeEnough2(sumConv, pkg.conv[hk], 1e-6), `head ${hk}: sum(conv) ${sumConv} != pkg.conv ${pkg.conv[hk]}`);
    assert.ok(closeEnough2(sumStat, pkg.stat[hk], 1e-6), `head ${hk}: sum(stat) ${sumStat} != pkg.stat ${pkg.stat[hk]}`);
  });
});

test('stackMarginals: two different orders give different per-row marginals but the identical pkg', () => {
  const a = model.stackMarginals(MULTI_STATE, MULTI_ORDER, 0);
  const b = model.stackMarginals(MULTI_STATE, MULTI_ORDER.slice().reverse(), 0);

  // Same package total regardless of order (both sides, every head).
  model.meta.HEADS_ORDER.forEach((hk) => {
    assert.ok(closeEnough2(a.pkg.conv[hk], b.pkg.conv[hk], 1e-6), `pkg.conv[${hk}] differs by order`);
    assert.ok(closeEnough2(a.pkg.stat[hk], b.pkg.stat[hk], 1e-6), `pkg.stat[${hk}] differs by order`);
  });

  // The per-row split is NOT the same: at least one row/head combination
  // must disagree between the two orders (this is the load-bearing
  // difference from the flattened Shapley behavior, where reordering was
  // purely cosmetic and every row's value was order-independent).
  const byKey = (rows) => Object.fromEntries(rows.map((r) => [r.key, r.conv]));
  const ra = byKey(a.rows), rb = byKey(b.rows);
  const anyDiffers = MULTI_ORDER.some((k) =>
    model.meta.HEADS_ORDER.some((hk) => Math.abs((ra[k][hk] || 0) - (rb[k][hk] || 0)) > 1e-6)
  );
  assert.ok(anyDiffers, 'expected at least one row/head to differ between the two orders');
});

// A per-head marginal can be NEGATIVE for a real, in-range state — revenue
// drained from a base as behavior responds — even though the source's per-
// lever Shapley value is never negative for this tool's all-raise-a-tax
// levers (see docs/engine-requests/stack-static-vs-behavioral-overlay.md).
// ord at its max rate followed by cg at its max rate (both real, in-range
// dial values) drains the payroll base in ord's own row: raising the top
// ordinary rate shifts some income away from wage/payroll-taxed forms.
test('stackMarginals: a per-head marginal is NEGATIVE for a real state (drain)', () => {
  const ordMax = model.meta.BYKEY.ord.params[0].max;
  const cgMax = model.meta.BYKEY.cg.params[0].max;
  const state = { ord: { rate: ordMax }, cg: { rate: cgMax } };
  const { rows } = model.stackMarginals(state, ['ord', 'cg'], 0);
  const ordRow = rows.find((r) => r.key === 'ord');
  assert.ok(ordRow.conv.pay < -0.05, `expected ord's row to drain the payroll base, got ${ordRow.conv.pay}`);
});

// ---- the mechanical tier -------------------------------------------------- //
// The stack view's middle rung. It must telescope like the other two and sit
// between them for a package of pure rate increases, where base interactions
// cost revenue and behavior costs more.

test('stackMarginals: the mechanical rung telescopes to pkg per head, like stat and conv', () => {
  const { rows, pkg } = model.stackMarginals(MULTI_STATE, MULTI_ORDER, 0);
  model.meta.HEADS_ORDER.forEach((hk) => {
    const sumMech = rows.reduce((t, r) => t + (r.mech[hk] || 0), 0);
    assert.ok(closeEnough2(sumMech, pkg.mech[hk], 1e-6), `head ${hk}: sum(mech) ${sumMech} != pkg.mech ${pkg.mech[hk]}`);
  });
});

test('stackMarginals: mechanical sits between first-order and collected for a rate-increase package', () => {
  const { pkg } = model.stackMarginals(MULTI_STATE, MULTI_ORDER, 0);
  const net = (seg) => model.meta.HEADS_ORDER.reduce((t, hk) => t + (seg[hk] || 0), 0);
  const s = net(pkg.stat), m = net(pkg.mech), c = net(pkg.conv);
  assert.ok(s > m && m > c, `expected first-order ${s} > mechanical ${m} > collected ${c}`);
});

// ---- the exclusion axis (ladder_x) ---------------------------------------- //
// `deemed`'s position axis crossed with a continuous exclusion. Both pieces the
// port added — the within-position ratio and the exclusion interpolation — are
// asserted directly here; the 31 fidelity checks above cover them in aggregate.

test('ladderRatio is exactly 1 at exclusion 0 and falls monotonically above it', () => {
  const exems = [0, 500000, 1000000, 3000000, 5000000];
  const ratios = exems.map((exem) => model.ladderRatio({ deemed: { pos: 'deemed', exem } }));
  ratios[0].forEach((r, d) => assert.ok(closeEnough2(r, 1, 1e-12), `decade ${d}: ratio at exclusion 0 is ${r}, not 1`));
  for (let i = 1; i < exems.length; i++) {
    ratios[i].forEach((r, d) => {
      assert.ok(r > 0 && r < 1, `exclusion ${exems[i]}, decade ${d}: ratio ${r} outside (0,1)`);
      assert.ok(r < ratios[i - 1][d] + 1e-12, `exclusion ${exems[i]}, decade ${d}: ratio rose to ${r}`);
    });
  }
});

// Knot-verbatim rule: a state landing exactly on a (position, exclusion) knot
// pair returns the stored row with no interpolation arithmetic. This is what
// keeps an anchor state reproducing its own model run bit-for-bit.
test('evalGrid returns the stored row verbatim on an exact position/exclusion knot pair', () => {
  const deemed = model.meta.BYKEY.deemed;
  const [pos, exem] = deemed.params;
  const rows = DATA.surrogate.solo.deemed.ct;
  pos.knots.forEach((p, i) => {
    exem.knots.forEach((x, j) => {
      const got = model.evalGrid(deemed, rows, { pos: p, exem: x });
      assert.deepEqual(got, rows[i * exem.knots.length + j], `knot (${p}, ${x}) is not verbatim`);
    });
  });
});

// A param the state omits sits at its off value, so a pre-exclusion state
// (`{pos}` with no `exem`) must evaluate identically to an explicit zero. The
// handoff artifact's own older states are shaped that way.
test('evalGrid treats an omitted exclusion as its off value', () => {
  const deemed = model.meta.BYKEY.deemed;
  const rows = DATA.surrogate.solo.deemed.ct;
  assert.deepEqual(
    model.evalGrid(deemed, rows, { pos: 'deemed' }),
    model.evalGrid(deemed, rows, { pos: 'deemed', exem: 0 })
  );
});

// A nonzero exclusion narrows the base, so it must raise less than the same
// position with no exclusion — through the whole evaluator, not just the grid.
test('a gains-at-death exclusion reduces revenue at every decade', () => {
  const none = model.evalQ('ct', { deemed: { pos: 'deemed', exem: 0 } });
  const some = model.evalQ('ct', { deemed: { pos: 'deemed', exem: 5000000 } });
  for (let d = 0; d < 3; d++) {
    assert.ok(some[d] < none[d], `decade ${d}: exclusion raised revenue (${some[d]} vs ${none[d]})`);
  }
});

// exemInterp's interpolation branch: an off-anchor exclusion must land strictly
// between the measured anchors around it. Reached only when the state pairs the
// ladder with another lever, since byExem lives on pair entries.
test('an off-anchor exclusion interpolates between the measured anchors (paired state)', () => {
  const at = (exem) => model.evalQ('ct', { cg: { rate: 40 }, deemed: { pos: 'deemed', exem } })[0];
  const lo = at(1000000), mid = at(3000000), hi = at(5000000);
  assert.ok(lo > mid && mid > hi, `expected ${lo} > ${mid} > ${hi} across the exclusion anchors`);
});
