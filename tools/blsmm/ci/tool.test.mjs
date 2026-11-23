// Node tests for the BLSMM tool's pure modules. Run by ci/validate.sh:
//   node --test tools/blsmm/ci/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate, OUTPUT_COLUMNS } from '../vendor/blsmm-model/blsmm-model.js';
import {
  INPUTS, PRESETS, FIRST_YEAR, YEARS, N_YEARS, FY_LABELS, FY_SPAN, buildShapeDelta, zeroInputDeltas, toModelDeltas, presetDeltas,
} from '../inputs.js';
import {
  deriveResults, kpis, multiplierText, deviationSummaryText, deviationTable, summaryTable,
  keyVariablesCsv, frameCsv, userDeltasCsv, srLevelDesc, scenarioNote, scenarioStatus,
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

// The forecast window is a constant in inputs.js, not read from the model data, so a
// re-vendored model-data.json with a new window must fail here rather than relabel
// every chart a year off.
test('FIRST_YEAR matches the vendored model data window', () => {
  assert.equal(data.forecast_exog.year[0], FIRST_YEAR);
  assert.equal(data.forecast_exog.year.length, FY_LABELS.length);
  assert.equal(data.forecast_resid.year[0], FIRST_YEAR);
  assert.equal(data.first_forecast_year, FIRST_YEAR);
  assert.equal(data.last_forecast_year, YEARS.at(-1));
  assert.equal(data.history_year, FIRST_YEAR - 1);
  assert.ok(data.historical.year.includes(FIRST_YEAR - 1), `historical has FY${FIRST_YEAR - 1}`);
});

test('every window mention in index.html and the chart captions is the current window', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/&ndash;/g, '–');
  const spans = html.match(/FY\d{4}–FY\d{4}/g) ?? [];
  assert.ok(spans.length >= 4, 'index.html states the window');
  for (const s of spans) assert.equal(s, FY_SPAN);
  for (const c of [...LEVEL_CHARTS, ...DEV_CHARTS]) assert.ok(c.caption.endsWith(`${FY_SPAN}.`), c.id);
});

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
  assert.equal(ai.productivity[0], 0.301);
  assert.equal(ai.lf_growth[0], -0.646440957);
  assert.ok(ai.receipts.every((v) => v === 0));
  // Presets keep calendar years: the defense bump is FY2027, the inflation peak FY2028.
  assert.equal(preset('military_conflict').outlays[YEARS.indexOf(2027)], 1.4227834274935043);
  assert.equal(preset('persistent_infl').inflation_shock[YEARS.indexOf(2028)], 0.3);
});

test('baseline: zero deviations, scenario keyed but not drawn, baseline texts', () => {
  const r = run(zeroInputDeltas(), false, true);
  assert.deepEqual(kpis(r), { finalDebt: '+0.00 pp', maxUnemployment: '+0.00 pp' });
  assert.match(multiplierText(r), /^No shock specified/);
  assert.match(deviationSummaryText(r), /^Baseline scenario - no shocks applied/);
  const { spec, rows } = levelChartData(LEVEL_CHARTS.find((c) => c.id === 'plot_unemployment'), r);
  assert.deepEqual(spec.series_order, ['Baseline', 'Scenario']);
  assert.deepEqual(spec.series_styles, { Baseline: { dashed: true } });
  assert.equal(spec.source, 'The Budget Lab Small Macro Model');
  assert.equal(rows.length, 22);
  assert.ok(rows.filter((row) => row.series === 'Baseline').every((row) => row.value !== ''));
  assert.ok(rows.filter((row) => row.series === 'Scenario').every((row) => row.value === ''));
  const moved = levelChartData(LEVEL_CHARTS.find((c) => c.id === 'plot_unemployment'), run(preset('rapid_ai'))).rows;
  assert.ok(moved.filter((row) => row.series === 'Scenario').every((row) => row.value !== ''));
});

// Full precision, matching scenarios/results/ in the model repo, on the 2026 Q4 SPF
// baseline (FY2027-FY2036). FY2036 final debt as the model release states it.
test('presets match the R scenario runs', () => {
  const r = run(preset('rapid_ai'));
  assert.deepEqual(kpis(r), { finalDebt: '-3.26 pp', maxUnemployment: '+0.04 pp' });
  assert.deepEqual(kpis(run(preset('persistent_infl'))), { finalDebt: '-0.37 pp', maxUnemployment: '+0.33 pp' });
  assert.deepEqual(kpis(run(preset('military_conflict'))), { finalDebt: '+8.36 pp', maxUnemployment: '-0.35 pp' });
  assert.match(multiplierText(r), /^Growth Shock {2}LF Growth \+ Productivity/);
});

test('fiscal preset takes the fiscal-multiplier branch', () => {
  const r = run(preset('military_conflict'));
  const t = multiplierText(r);
  assert.match(t, /^Fiscal Shock {2}Receipts - Outlays \(max: \+1\.42 pp of GDP\)/);
  assert.match(t, /Peak \(FY2027\)/);
  assert.ok(new RegExp(`\\n {2}Impact \\(${FY_LABELS[0]}\\): -?\\d+\\.\\d{2}\\n`).test(t), 'Impact label');
  assert.match(deviationSummaryText(r), /Outlays Delta: max \+1\.42 pp of GDP/);
});

test('other shocks list three-space indented items', () => {
  const d = zeroInputDeltas();
  d.inflation_shock = buildShapeDelta('onetime', 1);
  assert.match(multiplierText(run(d)), /Applied:\n {3}Inflation Shock: \+1\.00 pp\n/);
});

test('history row: model-data history values, historical RG, no r*', () => {
  const r = run(preset('rapid_ai'));
  const hist = data.historical;
  const ih = hist.year.indexOf(FIRST_YEAR - 1);
  const b = r.baselineHist.cols;
  assert.equal(b.fy_label[0], `FY${FIRST_YEAR - 1}`);
  assert.equal(b.year[0], FIRST_YEAR - 1);
  assert.equal(b.U[0], hist.U[ih]);
  assert.equal(b.rgfr_star[0], data.history_receipts_outlays.rgfr_star);
  assert.equal(b.rgfop_star[0], data.history_receipts_outlays.rgfop_star);
  assert.equal(b.real_gdp_growth[0], data.history_growth.real_gdp_growth);
  // Departure from the Shiny app, which carries both over from the first forecast year.
  assert.equal(b.RG[0], hist.RG[ih]);
  assert.equal(b.rfstar[0], null);
  // Both frames share the same history row.
  assert.equal(r.scenarioHist.cols.U[0], b.U[0]);
  assert.equal(r.scenarioHist.cols.RG[0], b.RG[0]);
});

test('history row metadata must be for the year before FIRST_YEAR', () => {
  const stale = { ...data, history_growth: { ...data.history_growth, year: FIRST_YEAR - 2 } };
  assert.throws(() => deriveResults(stale, base, base, OUTPUT_COLUMNS, null), /history_growth is not for/);
});

// The model repo's js/reference-values.mjs (vendored at VERSION) computes every
// displayed Levels series from the model and model-data.json, independently of this
// tool's display code. Every value the tool plots must match it; r*, which the table
// omits, is checked against the simulation and must be absent in the history year.
test('Levels chart values match the model repo reference table', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'blsmm-ref-'));
  const csv = path.join(dir, 'reference.csv');
  execFileSync(process.execPath, [fileURLToPath(new URL('../vendor/blsmm-model/reference-values.mjs', import.meta.url)), csv]);
  const [head, ...lines] = readFileSync(csv, 'utf8').trim().split(/\r?\n/).map((l) => l.split(','));
  rmSync(dir, { recursive: true, force: true });

  const chart = (id, v = 0) => LEVEL_CHARTS.find((c) => c.id === id).vars[v].value;
  const SERIES = {
    debt_pct_gdp: chart('plot_debt'),
    deficit_pct_gdp: chart('plot_budget_balance'),
    primary_deficit_pct_gdp: chart('plot_primary_balance'),
    receipts_pct_gdp: chart('plot_total_receipts'),
    primary_outlays_pct_gdp: chart('plot_primary_outlays'),
    total_outlays_pct_gdp: chart('plot_total_outlays'),
    real_gdp_growth: chart('plot_real_gdp_growth'),
    unemployment: chart('plot_unemployment'),
    inflation: chart('plot_inflation'),
    fed_funds: chart('plot_federal_funds'),
    r10: chart('plot_10yr_yield'),
    avg_rate_on_debt: chart('plot_avg_interest_rate'),
  };
  assert.deepEqual(Object.keys(SERIES).filter((k) => !head.includes(k)), [], 'reference table has every series');
  const results = { baseline: run(zeroInputDeltas(), false, true) };
  const sims = { baseline: base };
  for (const p of PRESETS) {
    results[p.model] = run(preset(p.id));
    sims[p.model] = simulate(data, { deltas: toModelDeltas(preset(p.id)) }).columns;
  }
  const real10 = chart('plot_10yr_yield', 1);
  const rstar = chart('plot_federal_funds', 1);
  assert.equal(lines.length, Object.keys(results).length * (N_YEARS + 1));
  for (const cells of lines) {
    const row = Object.fromEntries(head.map((h, i) => [h, cells[i]]));
    const c = results[row.scenario].scenarioHist.cols;
    const i = c.year.indexOf(Number(row.fiscal_year));
    assert.ok(i >= 0, `${row.scenario} ${row.fiscal_year}`);
    for (const [k, value] of Object.entries(SERIES)) {
      const got = value(c, i);
      assert.ok(Math.abs(got - Number(row[k])) < 1e-9, `${row.scenario} FY${row.fiscal_year} ${k}: ${got} vs ${row[k]}`);
    }
    const at = `${row.scenario} FY${row.fiscal_year}`;
    assert.ok(Math.abs(real10(c, i) - (Number(row.r10) - Number(row.inflation))) < 1e-9, `${at} real 10Y`);
    if (row.period === 'history') assert.equal(rstar(c, i), null, `${at} r*`);
    else assert.equal(rstar(c, i), sims[row.scenario].rfstar[i - 1], `${at} r*`);
  }
});

test('every chart builds a valid spec with rows for every x category', () => {
  const r = run(preset('rapid_ai'));
  for (const def of LEVEL_CHARTS) {
    const { spec, rows } = levelChartData(def, r);
    assert.equal(spec.value_suffix, '%', def.id);
    for (const s of spec.series_order) {
      assert.equal(rows.filter((x) => x.series === s).length, spec.x_order.length, `${def.id} ${s}`);
    }
    // The one gap: r* has no history-year value.
    const gap = (x) => x.series.startsWith('r* ') && x.year === spec.x_order[0];
    assert.ok(rows.every((x) => gap(x) || (x.value !== '' && Number.isFinite(Number(x.value)))), def.id);
    if (def.id === 'plot_federal_funds') assert.ok(rows.filter(gap).every((x) => x.value === ''));
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
  assert.ok(scen[1].endsWith(`,${FY_LABELS[0]},`), 'first-year real GDP growth is NA (empty)');
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

test('PNG scenario note: preset, custom inputs with size and years, baseline, fast expectations', () => {
  assert.equal(scenarioNote(preset('rapid_ai'), false, 'rapid_ai'),
    'Scenario: AI Adoption preset. Productivity boost + labor-force participation decline (Karger et al.).');
  const d = zeroInputDeltas();
  d.productivity = buildShapeDelta('permanent', 0.5);
  d.receipts[0] = 1;
  d.inflation_target = [0, 0.1, 0.2, 0.3, 0, 0, 0, 0, 0, 0];
  assert.equal(scenarioNote(d, true, null),
    'Scenario: custom. Productivity Growth +0.50 pp, FY2027–FY2036; Receipts +1.00 pp of GDP, FY2027; '
    + 'Inflation Target +0.10 to +0.30 pp, varying by year, FY2028–FY2030. Fast expectations.');
  assert.equal(scenarioNote(zeroInputDeltas(), false, null), 'Scenario: baseline (no changes).');
  const { spec } = levelChartData(LEVEL_CHARTS[0], { ...run(d), scenarioNote: 'x' });
  assert.equal(spec.note, 'x');
});

test('scenario controls: preset, baseline, and custom once inputs or fast expectations change', () => {
  assert.deepEqual(scenarioStatus(preset('rapid_ai'), false, 'rapid_ai'), {
    kind: 'preset', preset: 'rapid_ai', label: 'AI Adoption',
    text: 'Productivity boost + labor-force participation decline (Karger et al.).',
  });
  // A preset with fast expectations is still that preset.
  assert.equal(scenarioStatus(preset('rapid_ai'), true, 'rapid_ai').kind, 'preset');
  assert.equal(scenarioStatus(zeroInputDeltas(), false, null).kind, 'baseline');
  assert.equal(scenarioStatus(zeroInputDeltas(), true, null).kind, 'custom');
  const d = zeroInputDeltas();
  d.receipts[0] = 1;
  assert.equal(scenarioStatus(d, false, null).kind, 'custom');
});
