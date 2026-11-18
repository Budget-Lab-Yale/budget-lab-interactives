// tools/taxes-at-the-top/test/distribution-sign.test.mjs
//
// The distribution card's sign discipline. `lostToBehavior` is model.js's
// `staticNew - collectedNew`, and it goes NEGATIVE whenever behavior RAISES
// collections above the first-order estimate. That is a real state of this
// model, not an error: taxing gains at death removes the step-up, which kills
// the lock-in incentive, so realizations rise and the base comes in bigger than
// the first-order estimate assumed. It is in the modelers' own held-out runs —
// two of the 31 fixtures in meta.surrogate.checks report conventional revenue
// above their static totals in the first decade, both gains-at-death states.
// (The first decade is the one that matters: it holds the card's 2027 slice.
// Through the 2026-07-30 vintage both runs stayed above in all three decades.)
//
// The rule these tests pin (Sylva, 2026-08-26): ONE label, "Lost to behavior",
// everywhere; the SIGN of the value carries the direction; a positive takes no
// explicit "+". Nothing branches on the sign, so no surface can drift out of
// step with another — an earlier design switched label, subtitle, caption and
// identity note together on a per-render flag, which kept them agreeing but made
// the copy move under the reader for something the number already says.
//
// Driven from the REAL model and the shipped data/data.json rather than a
// synthetic fixture, so a future vintage that changes these signs fails here
// instead of shipping a false claim.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel } from '../model.js';
import { buildDistSpec, distHeader, distTipCfg, rateTipCfg } from '../render/distribution.js';

const DATA = JSON.parse(readFileSync(new URL('../data/data.json', import.meta.url)));
const model = createModel(DATA);

// Toggling the gains-at-death lever on and touching nothing else: initState
// gives a `pos` dial its `ref` ('deemed') and a `usd` dial current law (0), so
// this is a single click, not a hunted-for corner.
const RAISING = { deemed: { pos: 'deemed', exem: 0 } };
// A plain top-rate hike: behavior leaks revenue in every group, the common case.
const LOSING = { ord: { rate: 45 } };

const distOf = (state) => model.computeDistribution(state, 0, 'expanded');
const num = (s) => Number(String(s).replace('−', '-').replace(/[$B,\spp]/g, ''));

test('the shipped data really does invert the sign — this is not a synthetic case', () => {
  const dist = distOf(RAISING);
  const negatives = Object.keys(dist).filter((g) => dist[g].lostToBehavior < -0.05);
  assert.ok(negatives.length >= 5, `expected the deemed state to invert several groups, got ${negatives}`);
  assert.ok(dist['Quintile 5'].lostToBehavior < -1, 'Quintile 5 must collect more than the first-order estimate');
  // And the ordinary case still leans the other way, so the test is not vacuous.
  assert.ok(distOf(LOSING)['Quintile 5'].lostToBehavior > 1);
});

test('the modelers’ own held-out runs carry it too, so it is not a surrogate artifact', () => {
  const adds = DATA.meta.surrogate.checks.filter((c) => c.conv_totals[0] > c.static_totals[0]);
  assert.ok(adds.length > 0, 'no held-out run shows conventional revenue above static');
  adds.forEach((c) => {
    assert.equal((c.state.deemed || {}).pos, 'deemed',
      `${c.id} adds revenue through behavior without a gains-at-death regime`);
  });
});

test('ONE label, in every view and both directions', () => {
  ['context', 'new'].forEach((view) => {
    [RAISING, LOSING].forEach((state) => {
      const { spec } = buildDistSpec(distOf(state), view);
      assert.equal(spec.series_labels.lostToBehavior, 'Lost to behavior (not collected)');
      // The hatch keys the same series whichever way the value points.
      assert.equal(spec.series_patterns.lostToBehavior, '/');
    });
  });
  // The rate card's derived row names the same quantity the same way.
  const cfg = rateTipCfg('Top 1%', { current_law: 26.4, static: 33.8, collected: 31.2 }, 'expanded', 2027);
  assert.equal(cfg.rows[3].label, 'Lost to behavior (not collected)');
});
test('the dollar card prints the sign, and the identity reads on the card', () => {
  const row = distOf(RAISING)['Quintile 5'];
  const tip = distTipCfg('Quintile 5', row, 'new', 'expanded', 2027);
  const lost = tip.rows.find((r) => r.label === 'Lost to behavior (not collected)');
  const collected = tip.rows.find((r) => r.label === 'New tax collected');

  assert.ok(lost.value.startsWith('−'), `a negative must carry U+2212, got ${lost.value}`);
  assert.ok(!collected.value.startsWith('+'), 'no explicit plus anywhere');
  // 66 + (−45) = 21: the three numbers reconcile as printed.
  assert.equal(num(collected.value) + num(lost.value), num(tip.amount));
  // Both dollar views lead with the first-order estimate, context included.
  assert.equal(tip.sub, 'first-order estimate');
  assert.equal(distTipCfg('Quintile 5', row, 'context', 'expanded', 2027).sub, 'first-order estimate');
});

test('the rate card prints a minus but never a plus', () => {
  const loses = rateTipCfg('Top 1%', { current_law: 26.4, static: 33.8, collected: 31.2 }, 'expanded', 2027);
  assert.equal(loses.rows[3].value, '2.6 pp', 'the ordinary case takes no sign at all');

  const raises = rateTipCfg('Top 1%', { current_law: 26.4, static: 31.2, collected: 33.8 }, 'expanded', 2027);
  assert.equal(raises.rows[3].value, '−2.6 pp');

  const flat = rateTipCfg('Quintile 1', { current_law: 4.0, static: 4.02, collected: 4.0 }, 'hs', 2027);
  assert.equal(flat.rows[3].value, '0.0 pp', 'a gap that rounds away claims no direction');

  // Driven from the real model: the printed sign must match the arithmetic.
  const dist = distOf(RAISING);
  Object.keys(dist).forEach((g) => {
    const r = dist[g];
    const cfg = rateTipCfg(g, { current_law: r.rateCurrentLaw, static: r.rateStatic, collected: r.rateCollected }, 'expanded', 2027);
    const gap = r.rateStatic - r.rateCollected;
    const printed = cfg.rows[3].value;
    if (gap < -0.05) assert.ok(printed.startsWith('−'), `${g}: gap ${gap} should print negative, got ${printed}`);
    else assert.ok(!printed.startsWith('−'), `${g}: gap ${gap} should not print negative, got ${printed}`);
    assert.ok(!printed.startsWith('+'), `${g}: no explicit plus`);
  });
});
