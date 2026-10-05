// Node tests for the BLSMM tool's pure modules. Run by ci/validate.sh:
//   node --test tools/blsmm/ci/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulate, OUTPUT_COLUMNS } from '../vendor/blsmm-model/blsmm-model.js';
import { INPUTS, PRESETS, buildShapeDelta, zeroInputDeltas, toModelDeltas, presetDeltas } from '../inputs.js';
import {
  deriveResults, kpis, multiplierText, deviationSummaryText, deviationTable, summaryTable,
  keyVariablesCsv, frameCsv, userDeltasCsv, srLevelDesc,
} from '../results.js';
import { LEVEL_CHARTS, DEV_CHARTS, levelChartData, devChartData } from '../charts.js';
import { encodeState, decodeState } from '../share.js';
import { signed, fixed, signedDelta, parseDelta } from '../format.js';

const data = JSON.parse(readFileSync(new URL('../vendor/blsmm-model/model-data.json', import.meta.url), 'utf8'));
const base = simulate(data).columns;

function run(deltas, fast = false, shockNull = false) {
  const scen = simulate(data, { deltas: toModelDeltas(deltas), fastExpectations: fast }).columns;
  return deriveResults(data, base, scen, OUTPUT_COLUMNS, shockNull ? null : deltas);
}
const preset = (id) => presetDeltas(data, PRESETS.find((p) => p.id === id));

test('number formats match R sprintf', () => {
  assert.equal(signed(0, 2), '+0.00');
  assert.equal(signed(-0.001, 2), '-0.00');
  assert.equal(signed(1.234, 2), '+1.23');
  assert.equal(signed(Infinity, 2), '+Inf');
  assert.equal(signed(NaN, 2), 'NaN');
  assert.equal(fixed(null, 2), 'NA');
  assert.equal(signedDelta(0), '0.00');
  assert.equal(signedDelta(0.5), '+0.50');
  assert.equal(parseDelta('abc'), 0);
  assert.equal(parseDelta(' -1.5 '), -1.5);
});

test('shape paths match build_shape_delta()', () => {
  assert.deepEqual(buildShapeDelta('onetime', 2), [2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(buildShapeDelta('temporary3', 1), [1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(buildShapeDelta('permanent', -1), new Array(10).fill(-1));
  const ramp = buildShapeDelta('ramp', 0.9);
  assert.equal(ramp[0], 0);
  assert.equal(ramp[9], 0.9);
  assert.ok(Math.abs(ramp[3] - 0.3) < 1e-15);
  assert.deepEqual(buildShapeDelta('permanent', ''), new Array(10).fill(0));
});

test('presets load from the model data at full precision, unlisted inputs zero', () => {
  const ai = preset('rapid_ai');
  assert.equal(ai.productivity[0], 0.581);
  assert.equal(ai.lf_growth[0], -0.519291223);
  assert.ok(ai.receipts.every((v) => v === 0));
  assert.equal(preset('military_conflict').outlays[1], 1.4648663376827828);
  assert.equal(preset('persistent_infl').inflation_shock[2], 0.3);
});

test('baseline: zero deviations, baseline-only charts, baseline texts', () => {
  const r = run(zeroInputDeltas(), false, true);
  assert.ok(r.baselineOnly);
  assert.deepEqual(kpis(r), { finalDebt: '+0.00 pp', maxUnemployment: '+0.00 pp' });
  assert.match(multiplierText(r), /^No shock specified/);
  assert.match(deviationSummaryText(r), /^Baseline scenario - no shocks applied/);
  const { spec, rows } = levelChartData(LEVEL_CHARTS.find((c) => c.id === 'plot_unemployment'), r);
  assert.deepEqual(spec.series_order, ['Baseline']);
  assert.equal(spec.series_styles, undefined);
  assert.equal(rows.length, 11);
});

// Full precision, matching the R scenario files and the article figures. (The
// Shiny app rounded inputs to 0.01 and showed -4.89 / +8.04.)
test('presets match the R scenario runs', () => {
  const r = run(preset('rapid_ai'));
  assert.deepEqual(kpis(r), { finalDebt: '-4.92 pp', maxUnemployment: '+0.03 pp' });
  assert.deepEqual(kpis(run(preset('military_conflict'))), { finalDebt: '+8.06 pp', maxUnemployment: '-0.36 pp' });
  assert.equal(r.baselineOnly, false);
  assert.match(multiplierText(r), /^Growth Shock {2}LF Growth \+ Productivity/);
});

test('fiscal preset takes the fiscal-multiplier branch', () => {
  const r = run(preset('military_conflict'));
  const t = multiplierText(r);
  assert.match(t, /^Fiscal Shock {2}Receipts - Outlays \(max: \+1\.46 pp of GDP\)/);
  assert.match(t, /Peak \(FY2027\)/);
  assert.match(deviationSummaryText(r), /Outlays Delta: max \+1\.46 pp of GDP/);
});

test('other shocks list three-space indented items', () => {
  const d = zeroInputDeltas();
  d.inflation_shock = buildShapeDelta('onetime', 1);
  assert.match(multiplierText(run(d)), /Applied:\n {3}Inflation Shock: \+1\.00 pp\n/);
});

test('FY2025 history row reproduces the Shiny app, including its FY2026 carry-overs', () => {
  const r = run(preset('rapid_ai'));
  const hist = data.historical;
  const i25 = hist.year.indexOf(2025);
  const b = r.baselineHist.cols;
  assert.equal(b.fy_label[0], 'FY2025');
  assert.equal(b.U[0], hist.U[i25]);
  assert.equal(b.rgfr_star[0], 17.3);
  // Known quirk, kept for fidelity: RG and rfstar are not overwritten.
  assert.equal(b.RG[0], base.RG[0]);
  assert.equal(b.rfstar[0], base.rfstar[0]);
  assert.notEqual(b.RG[0], hist.RG[i25]);
  // Both frames share the same history row.
  assert.equal(r.scenarioHist.cols.U[0], b.U[0]);
});

test('every chart builds a valid spec with rows for every x category', () => {
  const r = run(preset('rapid_ai'));
  for (const def of LEVEL_CHARTS) {
    const { spec, rows } = levelChartData(def, r);
    assert.equal(spec.value_suffix, '%', def.id);
    for (const s of spec.series_order) {
      assert.equal(rows.filter((x) => x.series === s).length, spec.x_order.length, `${def.id} ${s}`);
    }
    assert.ok(rows.every((x) => x.value !== '' && Number.isFinite(Number(x.value))), def.id);
  }
  for (const def of DEV_CHARTS) {
    const { spec, rows } = devChartData(def, r);
    assert.equal(spec.value_suffix, ' pp', def.id);
    assert.equal(rows.length, def.id === 'dev_plot_real_gdp_growth' ? 9 : 10, def.id);
  }
});

test('tables', () => {
  const r = run(preset('military_conflict'));
  const dt = deviationTable(r);
  assert.equal(dt.header.length, 8);
  assert.equal(dt.rows.length, 10);
  const st = summaryTable(preset('military_conflict'));
  assert.equal(st.rows[3].label, 'Primary Outlays (pp of GDP)');
  assert.ok(st.rows[3].cells.every((c) => c.nonzero));
  assert.ok(st.rows[0].cells.every((c) => !c.nonzero));
});

test('export files', () => {
  const d = preset('rapid_ai');
  const r = run(d);
  const kv = keyVariablesCsv(r).split('\n');
  assert.equal(kv[0].split(',').length, 1 + 12 * 3);
  assert.equal(kv.length, 12); // header + 10 rows + trailing newline
  const dev = frameCsv(r.deviations).split('\n')[0].split(',');
  assert.equal(dev[0], 'fy_label');
  assert.ok(dev.includes('d_real_gdp_growth') && !dev.includes('d_year') && !dev.includes('d_solver_sse'));
  const scen = frameCsv(r.scenario).split('\n');
  assert.ok(scen[1].endsWith(',FY2026,'), 'FY2026 real GDP growth is NA (empty)');
  assert.equal(userDeltasCsv(d).split('\n')[0], 'FY,LF_Growth,Productivity,Receipts,Outlays,RFstar_Direct,Output_Gap_Shock,Inflation_Shock,MP_Rule_Shock,Inflation_Target');
});

test('share links round-trip', () => {
  const d = zeroInputDeltas();
  d.receipts = buildShapeDelta('temporary3', -1);
  d.lf_growth[9] = 0.123456789;
  const state = { deltas: d, fast: true, activePreset: null };
  const h = encodeState(state);
  assert.equal(h, 'lf_growth=0,0,0,0,0,0,0,0,0,0.123456789&receipts=-1,-1,-1&fast=1');
  assert.deepEqual(decodeState(`#${h}`, data), state);

  const p = { deltas: preset('rapid_ai'), fast: false, activePreset: 'rapid_ai' };
  assert.equal(encodeState(p), 'preset=rapid_ai');
  assert.deepEqual(decodeState('#preset=rapid_ai', data), p);

  assert.equal(encodeState({ deltas: zeroInputDeltas(), fast: false, activePreset: null }), '');
  assert.equal(decodeState('', data), null);
  assert.equal(decodeState('#receipts=1,abc', data), null, 'malformed paths are ignored');
  assert.equal(decodeState('#nonsense=1', data), null);
  assert.equal(decodeState('#__proto__=1&constructor=2', data), null, 'inherited keys are not inputs');
  assert.equal(decodeState('#main-content', data), null, 'the skip-link fragment is not a scenario');
});

test('screen-reader descriptions follow sr_level_desc()', () => {
  const s = srLevelDesc([1, 2], [1, 2.5], ['FY2026', 'FY2027'], 2, ' percent', 'Rate');
  assert.equal(s, 'Rate. Baseline: 1.00 percent in FY2026, ending 2.00 percent in FY2027. Scenario ends at 2.50 percent (+0.50 percent from baseline).');
});

test('every input maps to a model delta path', () => {
  const keys = new Set(INPUTS.map((i) => i.delta));
  assert.equal(keys.size, 9);
});
