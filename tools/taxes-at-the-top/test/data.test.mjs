import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const DATA = JSON.parse(readFileSync(new URL('../data/data.json', import.meta.url)));

test('data.json has the surrogate schema', () => {
  assert.deepEqual(Object.keys(DATA).sort(), ['etr_base', 'income_levels', 'meta', 'surrogate']);
  assert.equal(DATA.meta.levers.length, 8);
  assert.ok(Array.isArray(DATA.meta.decades) && DATA.meta.decades.length === 3);
  assert.ok(DATA.surrogate.solo && DATA.surrogate.pairs && DATA.surrogate.triples && DATA.surrogate.g);
  assert.ok(DATA.meta.surrogate.m && DATA.meta.surrogate.heads_order);
  assert.ok(DATA.etr_base.expanded && DATA.etr_base.hs);        // ETR baseline per income def
  const checks = DATA.meta.surrogate.checks;
  assert.ok(Array.isArray(checks) && checks.length === 31);     // 21 quiz + 10 corners
  for (const c of checks) {
    assert.equal(c.conv_totals.length, 3);
    assert.equal(c.static_totals.length, 3);
  }
});

// The three-tier quantity set is what the stack view's three rungs read. `mt/my/mh`
// (mechanical: tax-base interactions with behavior held fixed) arrived with run
// vintage v6; a vintage missing them would silently render an empty middle bar
// rather than failing.
test('data.json carries all three revenue tiers, each with a vector length', () => {
  const q = DATA.meta.surrogate.quantities;
  for (const qid of ['ct', 'cy', 'ch', 'mt', 'my', 'mh', 'st', 'sy', 'sh', 'etr', 'etrc']) {
    assert.ok(q.includes(qid), `meta.surrogate.quantities is missing ${qid}`);
    assert.equal(typeof DATA.meta.surrogate.m[qid], 'number', `meta.surrogate.m has no entry for ${qid}`);
  }
  // The by-head trio shares one layout, so the stack view can difference them.
  assert.equal(DATA.meta.surrogate.m.mh, DATA.meta.surrogate.m.ch);
  assert.equal(DATA.meta.surrogate.m.sh, DATA.meta.surrogate.m.ch);
});

// `deemed` gained an exclusion sub-axis in v6: a position axis crossed with a
// continuous exclusion. The grid must be fully populated (positions x exclusion
// knots) or evalGrid's two-axis lookup reads past the end of the rows.
test('the deemed lever is a fully-populated ladder_x grid (positions x exclusion knots)', () => {
  const deemed = DATA.meta.levers.find(l => l.key === 'deemed');
  assert.equal(deemed.interp, 'ladder_x');
  assert.equal(deemed.params.length, 2);
  const [pos, exem] = deemed.params;
  assert.equal(pos.scale, 'pos');
  assert.deepEqual(pos.positions, ['off', 'carryover', 'deemed']);
  assert.equal(exem.key, 'exem');
  assert.equal(exem.off, 0);
  assert.equal(DATA.surrogate.g.deemed.length, pos.knots.length * exem.knots.length);
  for (const [qid, rows] of Object.entries(DATA.surrogate.solo.deemed)) {
    assert.equal(rows.length, pos.knots.length * exem.knots.length, `solo.deemed.${qid} row count`);
  }
});

// byExem carries measured interaction vectors at nonzero exclusions. Only pairs
// have them — which is why model.js's tripleTerm has no exclusion-interpolation
// branch — and only at the `deemed` position. A vintage that added them to
// triples, or to `carryover`, would need a matching branch in the evaluator.
test('byExem appears only on deemed pairs, only at the deemed position', () => {
  for (const [key, entry] of Object.entries(DATA.surrogate.pairs)) {
    if (!entry.byExem) continue;
    assert.ok(key.split('|').includes('deemed'), `pair ${key} has byExem without deemed`);
    assert.deepEqual(Object.keys(entry.byExem), ['deemed'], `pair ${key} byExem positions`);
  }
  for (const [key, entry] of Object.entries(DATA.surrogate.triples)) {
    assert.ok(!entry.byExem, `triple ${key} has byExem, which tripleTerm does not handle`);
  }
});

test('the corporate dial spans 21 to 35 percent with interior anchors', () => {
  const corp = DATA.meta.levers.find(l => l.key === 'corp').params[0];
  assert.equal(corp.min, 21);
  assert.equal(corp.max, 35);
  assert.deepEqual(corp.knots, [21, 24.5, 28, 31.5, 35]);
  assert.equal(DATA.surrogate.g.corp.length, corp.knots.length);
});
