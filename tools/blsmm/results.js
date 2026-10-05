/* ===========================================================================
 * Everything the Shiny server computed from a simulation, ported faithfully
 * from app/R/blsmm_server.R (Budget-Lab-Small-Macro-Model): display frames,
 * the FY2025 history row, deviations, KPIs, the text panels, the tables, the
 * screen-reader chart descriptions and the export files.
 *
 * Pure module (no DOM) so ci/results.test.mjs can exercise it in Node.
 *
 * Faithful-port note: add_fy2025_to_results() starts the FY2025 row from a
 * copy of the FY2026 baseline row and overwrites only some columns, so
 * FY2025 values of RG, rfstar, xgap and other un-overwritten columns are
 * FY2026 baseline values. withHistory() reproduces that on purpose; the model
 * owner has been told. Do not "fix" it here without them.
 * =========================================================================== */

import { fixed, signed } from './format.js?v=782a1bb3ec';
import { INPUT_BY_KEY, SUMMARY_ORDER, EXPORT_ORDER, FY_LABELS } from './inputs.js?v=782a1bb3ec';

const NA = null;
const isNA = (v) => v === null || v === undefined || Number.isNaN(v);
const sub = (a, b) => (isNA(a) || isNA(b) ? NA : a - b);
const absMax = (xs) => Math.max(...xs.filter((v) => !isNA(v)).map(Math.abs));
// which.max(abs(x)): first index of the largest absolute value.
const whichAbsMax = (xs) => {
  let best = -1;
  let bi = 0;
  xs.forEach((v, i) => { if (!isNA(v) && Math.abs(v) > best) { best = Math.abs(v); bi = i; } });
  return bi;
};
const mean = (xs) => {
  const v = xs.filter((x) => !isNA(x));
  return v.reduce((s, x) => s + x, 0) / v.length;
};
const last = (xs) => xs[xs.length - 1];

// R's all.equal() for numeric vectors, as in the model port.
export function rAllEqual(target, current, tolerance = 1.5e-8) {
  const t = [];
  const c = [];
  for (let i = 0; i < target.length; i++) {
    if (target[i] !== current[i]) { t.push(target[i]); c.push(current[i]); }
  }
  if (t.length === 0) return true;
  let xy = 0;
  let xn = 0;
  for (let i = 0; i < t.length; i++) { xy += Math.abs(t[i] - c[i]); xn += Math.abs(t[i]); }
  xy /= t.length;
  xn /= t.length;
  if (Number.isFinite(xn) && xn > tolerance) xy /= xn;
  return !(Number.isNaN(xy) || xy > tolerance);
}

// A frame is column arrays plus an explicit column order: the export writes
// columns in the order R's data frames had them.
function frame(cols, order) {
  return { cols, order };
}

// The simulation output plus fy_label and real_gdp_growth, in the column
// order the Shiny app's data frames had (model columns, fy_label, growth).
function displayFrame(sim, outputColumns) {
  const cols = {};
  for (const c of outputColumns) cols[c] = sim[c].slice();
  cols.fy_label = FY_LABELS.slice();
  const gdp = cols.GDP;
  cols.real_gdp_growth = gdp.map((v, i) => (i === 0 ? NA : ((v - gdp[i - 1]) / gdp[i - 1]) * 100));
  return frame(cols, [...outputColumns, 'fy_label', 'real_gdp_growth']);
}

// convert_to_old_structure(): d_<col> = scenario - baseline for every numeric
// column except year and solver_sse. solver_converged is logical in R, so it
// is skipped too.
function deviationsFrame(scen, base) {
  const cols = { fy_label: scen.cols.fy_label.slice() };
  const order = ['fy_label'];
  for (const c of scen.order) {
    if (c === 'year' || c === 'solver_sse' || c === 'fy_label' || c === 'solver_converged') continue;
    cols[`d_${c}`] = scen.cols[c].map((v, i) => sub(v, base.cols[c][i]));
    order.push(`d_${c}`);
  }
  return frame(cols, order);
}

function histRow(hist, year) {
  const i = hist.year.indexOf(year);
  if (i < 0) throw new Error(`Historical data for ${year} missing`);
  return Object.fromEntries(Object.entries(hist).map(([k, v]) => [k, v[i]]));
}

// add_fy2025_to_results(): prepend an FY2025 row built from history to both
// frames. See the header note about the copied FY2026 columns.
function withHistory(base, scen, hist) {
  const fy24 = histRow(hist, 2024);
  const fy25 = histRow(hist, 2025);
  fy24.GDP = fy24.GDPstar * (1 + fy24.xgap / 100);
  fy25.GDP = fy25.GDPstar * (1 + fy25.xgap / 100);

  const row = {};
  for (const c of base.order) row[c] = base.cols[c][0];
  row.fy_label = 'FY2025';
  row.year = 2025;
  row.U = fy25.U;
  row.PI = fy25.PI;
  row.PIE = fy25.PIE;
  row.GDP = fy25.GDPstar * (1 + fy25.xgap / 100);
  row.R10 = fy25.R10;
  row.RF = fy25.RF;
  row.D_pct_GDP = (fy25.D / fy25['GDP$']) * 100;
  row.BUD = fy25.BUD;
  row.NI = fy25.NI;
  row.BUDP = fy25.BUDP;
  row.D = fy25.D;
  row.GDPstar = fy25.GDPstar;
  row['GDP$'] = fy25['GDP$'];
  row['GDP$star'] = fy25['GDP$star'];
  row['GDP$star2'] = fy25['GDP$star2'];
  // FY2025 receipts: CBO's published 17.3% (hard-coded in the Shiny server);
  // primary outlays backed out of the primary balance.
  row.rgfr_star = 17.3;
  const receiptsNominal = (17.3 * fy25.GDPstar) / 100;
  row.rgfop_star = ((receiptsNominal - fy25.BUDP) / fy25.GDPstar) * 100;
  row.rbudp_star = isNA(fy25.rbudp_star) ? (fy25.BUDP / fy25.GDPstar) * 100 : fy25.rbudp_star;
  row.real_gdp_growth = ((fy25.GDP - fy24.GDP) / fy24.GDP) * 100;

  const prepend = (f) => {
    const cols = {};
    for (const c of f.order) cols[c] = [row[c], ...f.cols[c]];
    const gdp = cols.GDP;
    cols.real_gdp_growth = gdp.map((v, i) => (i === 0 ? row.real_gdp_growth : ((v - gdp[i - 1]) / gdp[i - 1]) * 100));
    return frame(cols, f.order);
  };
  return { baseline: prepend(base), scenario: prepend(scen) };
}

/**
 * @param {object} modelData   parsed model-data.json
 * @param {object} baseSim     simulate(modelData).columns
 * @param {object} scenSim     simulate(modelData, scenario).columns
 * @param {string[]} outputColumns  OUTPUT_COLUMNS from the model
 * @param {object|null} shock  the scenario's deltas keyed by input, or null for
 *   the untouched baseline (the Shiny app's shock_spec before any run)
 */
export function deriveResults(modelData, baseSim, scenSim, outputColumns, shock) {
  const baseline = displayFrame(baseSim, outputColumns);
  const scenario = displayFrame(scenSim, outputColumns);
  const deviations = deviationsFrame(scenario, baseline);
  const hist = withHistory(baseline, scenario, modelData.historical);
  return {
    baseline, scenario, deviations,
    baselineHist: hist.baseline, scenarioHist: hist.scenario,
    shock,
    params: modelData.params,
    // is_baseline_only(): compares unemployment, history row included.
    baselineOnly: rAllEqual(hist.baseline.cols.U, hist.scenario.cols.U, 1e-10),
  };
}

// --------------------------------------------------------------------------
// KPIs
// --------------------------------------------------------------------------

export function kpis(r) {
  const dU = r.deviations.cols.d_U;
  return {
    finalDebt: `${signed(last(r.deviations.cols.d_D_pct_GDP), 2)} pp`,
    maxUnemployment: `${signed(dU[whichAbsMax(dU)], 2)} pp`,
  };
}

// --------------------------------------------------------------------------
// Text panels
// --------------------------------------------------------------------------

const RULE = '─'.repeat(32);

export function outlaysIndirectText(r) {
  const lf = mean(r.scenario.cols.LF_fb);
  const prod = mean(r.scenario.cols.PROD_fb);
  return `From labor force growth: ${signed(lf, 3)} pp (psi_1 effect)\n`
    + `From productivity growth: ${signed(prod, 3)} pp (psi_2 effect)\n`
    + `${RULE}\n`
    + `Total indirect effect: ${signed(lf + prod, 3)} pp`;
}

export function primaryBalanceDerivedText(r, deltas) {
  const receipts = deltas.receipts;
  const direct = deltas.outlays;
  const indirect = r.scenario.cols.LF_fb.map((v, i) => v + r.scenario.cols.PROD_fb[i]);
  const total = direct.map((v, i) => v + indirect[i]);
  const balance = receipts.map((v, i) => v - total[i]);
  return `Receipts delta: ${signed(mean(receipts), 2)} pp (avg)\n`
    + `Primary outlays direct: ${signed(mean(direct), 2)} pp (avg)\n`
    + `Primary outlays indirect: ${signed(mean(indirect), 2)} pp (avg)\n`
    + `Primary outlays total: ${signed(mean(total), 2)} pp (avg)\n`
    + `${RULE}\n`
    + `Implied primary balance delta: ${signed(mean(balance), 2)} pp (avg)`;
}

export function rfstarIndirectText(r) {
  const growth = mean(r.scenario.cols.gradual_growth);
  const debt = mean(r.scenario.cols.debt_contrib);
  return `From potential growth: ${signed(growth, 3)} pp (kappa_1 + kappa_2 effect)\n`
    + `From debt/GDP proxy: ${signed(debt, 3)} pp (kappa_3 effect)\n`
    + `${RULE}\n`
    + `Total indirect effect: ${signed(growth + debt, 3)} pp`;
}

const safeMax = (x) => (!x || x.length === 0 || x.every(isNA) ? 0 : absMax(x));
const hasValues = (x) => Boolean(x) && x.some((v) => !isNA(v) && Math.abs(v) > 1e-10);

export function multiplierText(r) {
  const shock = r.shock;
  if (!shock) return 'No shock specified. Set shocks in input tables to see multiplier analysis.';
  const dev = r.deviations.cols;
  const netFiscal = shock.receipts.map((v, i) => v - shock.outlays[i]);
  const totalGrowth = shock.lf_growth.map((v, i) => v + shock.productivity[i]);
  const peakXgap = absMax(dev.d_xgap);
  const peakPeriod = whichAbsMax(dev.d_xgap);
  const finalDebt = last(dev.d_D_pct_GDP);
  const hasAnyDeviation = absMax(dev.d_xgap) > 0.001 || absMax(dev.d_PI) > 0.001;

  if (hasValues(shock.receipts) || hasValues(shock.outlays)) {
    const firstFiscal = netFiscal[0];
    const impact = Math.abs(firstFiscal) > 0.001 ? -dev.d_xgap[0] / firstFiscal : NA;
    const peakFiscal = safeMax(netFiscal);
    const peakMultiplier = -peakXgap / peakFiscal;
    return `Fiscal Shock  Receipts - Outlays (max: ${signed(peakFiscal, 2)} pp of GDP)\n`
      + `  Receipts delta max: ${signed(safeMax(shock.receipts), 2)} pp\n`
      + `  Outlays delta max: ${signed(safeMax(shock.outlays), 2)} pp\n\n`
      + 'Output Gap Multipliers:\n'
      + `  Impact (FY2026): ${fixed(impact, 2)}\n`
      + `  Peak (${dev.fy_label[peakPeriod]}): ${fixed(peakMultiplier, 2)}\n\n`
      + 'Debt Impact:\n'
      + `  Final Period Debt Change: ${signed(finalDebt, 2)} pp of GDP\n`
      + `  Debt Multiplier: ${fixed(-finalDebt / peakFiscal, 2)} (debt change per unit of fiscal shock)\n\n`
      + 'Note: Multipliers calculated using max shock value. With year-by-year shocks, interpretation varies.';
  }
  if (hasValues(shock.lf_growth) || hasValues(shock.productivity)) {
    const maxGrowth = safeMax(totalGrowth);
    return `Growth Shock  LF Growth + Productivity (max: ${signed(maxGrowth, 2)} pp)\n`
      + `  LF growth max: ${signed(safeMax(shock.lf_growth), 2)} pp\n`
      + `  Productivity max: ${signed(safeMax(shock.productivity), 2)} pp\n\n`
      + 'Debt Impact:\n'
      + `  Final Period Debt Change: ${signed(finalDebt, 2)} pp of GDP\n`
      + `  Debt-to-Growth Sensitivity: ${fixed(finalDebt / maxGrowth, 2)} pp debt change per pp growth\n\n`
      + 'Note: Positive growth reduces debt/GDP ratio.';
  }
  const others = [
    ['rfstar', 'r* Direct'],
    ['inflation_target', 'Inflation Target'],
    ['inflation_shock', 'Inflation Shock'],
    ['output_gap', 'Output Gap Shock'],
    ['monetary_rule', 'MP Rule Shock'],
  ].filter(([k]) => hasValues(shock[k]));
  if (others.length) {
    // paste("  ", shock_list, collapse = "\n") puts three spaces before each item.
    const list = others.map(([k, name]) => `   ${name}: ${signed(safeMax(shock[k]), 2)} pp`).join('\n');
    return 'Non-Fiscal/Non-Growth Shocks Applied:\n'
      + `${list}\n\n`
      + 'Impacts:\n'
      + `  Peak Output Gap: ${signed(peakXgap, 3)} pp\n`
      + `  Peak Inflation: ${signed(absMax(dev.d_PI), 3)} pp\n`
      + `  Final Debt/GDP Change: ${signed(finalDebt, 2)} pp\n\n`
      + 'Note: Traditional fiscal multipliers not applicable for these shock types.\n'
      + 'These shocks affect the economy through monetary policy and expectations channels.';
  }
  if (hasAnyDeviation) {
    return 'Simulation Results:\n\n'
      + 'Observed Impacts:\n'
      + `  Peak Output Gap: ${signed(peakXgap, 3)} pp\n`
      + `  Peak Inflation: ${signed(absMax(dev.d_PI), 3)} pp\n`
      + `  Peak Unemployment: ${signed(absMax(dev.d_U), 3)} pp\n`
      + `  Final Debt/GDP Change: ${signed(finalDebt, 2)} pp`;
  }
  return 'No significant shock specified. Set shocks in input tables to see multiplier analysis.';
}

export function deviationSummaryText(r) {
  const dev = r.deviations.cols;
  const maxes = 'Maximum Absolute Deviations:\n'
    + `  Output Gap: ${signed(absMax(dev.d_xgap), 3)} pp\n`
    + `  Inflation: ${signed(absMax(dev.d_PI), 3)} pp\n`
    + `  Debt/GDP: ${signed(absMax(dev.d_D_pct_GDP), 2)} pp\n\n`
    + `Final Period Debt/GDP Deviation: ${signed(last(dev.d_D_pct_GDP), 2)} pp`;
  const s = r.shock;
  if (!s) return `Baseline scenario - no shocks applied\n\n${maxes}`;
  return 'Shock Specification (Year-by-Year):\n'
    + `  Receipts Delta: max ${signed(safeMax(s.receipts), 2)} pp of GDP\n`
    + `  Outlays Delta: max ${signed(safeMax(s.outlays), 2)} pp of GDP\n`
    + `  LF Growth: max ${signed(safeMax(s.lf_growth), 2)} pp\n`
    + `  Productivity Growth: max ${signed(safeMax(s.productivity), 2)} pp\n`
    + `  r* Direct: max ${signed(safeMax(s.rfstar), 2)} pp\n`
    + `  Inflation Target: max ${signed(safeMax(s.inflation_target), 2)} pp\n`
    + `  Inflation Shock: max ${signed(safeMax(s.inflation_shock), 2)} pp\n`
    + `  Output Gap Shock: max ${signed(safeMax(s.output_gap), 2)} pp\n`
    + `  Mon. Policy Rule: max ${signed(safeMax(s.monetary_rule), 2)} pp\n\n`
    + maxes;
}

// --------------------------------------------------------------------------
// Tables
// --------------------------------------------------------------------------

export const DEVIATION_TABLE_COLUMNS = [
  ['d_xgap', 'Output Gap (pp)'],
  ['d_U', 'Unemployment (pp)'],
  ['d_PI', 'Inflation (pp)'],
  ['d_RF', 'Fed Funds (pp)'],
  ['d_R10', '10yr Rate (pp)'],
  ['d_D_pct_GDP', 'Debt/GDP (pp of GDP)'],
  ['d_NI', 'Net Interest ($B)'],
];

/** Sign class used for the red/green deviation cells (DT styleInterval cuts at +/-0.001). */
export function deviationSign(v) {
  if (v <= -0.001) return 'neg';
  if (v > 0.001) return 'pos';
  return 'zero';
}

export function deviationTable(r) {
  const dev = r.deviations.cols;
  return {
    header: ['Fiscal Year', ...DEVIATION_TABLE_COLUMNS.map(([, label]) => label)],
    rows: dev.fy_label.map((fy, i) => ({
      label: fy,
      cells: DEVIATION_TABLE_COLUMNS.map(([c]) => ({ text: fixed(dev[c][i], 2), sign: deviationSign(dev[c][i]) })),
    })),
  };
}

export function summaryTable(deltas) {
  return {
    header: ['Shock', ...FY_LABELS],
    rows: SUMMARY_ORDER.map((k) => ({
      label: INPUT_BY_KEY[k].summaryLabel,
      cells: deltas[k].map((v) => ({ text: fixed(v, 2), nonzero: v <= -1e-9 || v > 1e-9 })),
    })),
  };
}

// --------------------------------------------------------------------------
// Screen-reader chart descriptions (sr_level_desc / sr_dev_desc)
// --------------------------------------------------------------------------

export function srLevelDesc(b, s, fy, decimals, unit, label) {
  const keep = b.map((v, i) => !isNA(v) && !isNA(s[i]));
  if (!keep.some(Boolean)) return label;
  const bb = b.filter((_, i) => keep[i]);
  const ss = s.filter((_, i) => keep[i]);
  const ff = fy.filter((_, i) => keep[i]);
  const n = bb.length - 1;
  const dev = ss[n] - bb[n];
  const dir = Math.abs(dev) < 0.005 ? 'no significant change' : `${signed(dev, 2)}${unit}`;
  return `${label}. Baseline: ${fixed(bb[0], decimals)}${unit} in ${ff[0]}, ending ${fixed(bb[n], decimals)}${unit} in ${ff[n]}. `
    + `Scenario ends at ${fixed(ss[n], decimals)}${unit} (${dir} from baseline).`;
}

export function srDevDesc(dev, fy, unit, label) {
  const keep = dev.map((v) => !isNA(v));
  if (!keep.some(Boolean)) return label;
  const d = dev.filter((_, i) => keep[i]);
  const f = fy.filter((_, i) => keep[i]);
  const n = d.length - 1;
  const peak = whichAbsMax(d);
  const dir = Math.abs(d[n]) < 0.005 ? 'returns near zero' : `${signed(d[n], 2)}${unit}`;
  return `${label}. Peak deviation ${signed(d[peak], 2)}${unit} in ${f[peak]}. Final: ${dir} in ${f[n]}.`;
}

// --------------------------------------------------------------------------
// Export (the Shiny CSV + Excel downloads, as CSV files)
// --------------------------------------------------------------------------

function csvCell(v) {
  if (isNA(v)) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

export function frameCsv(f) {
  const n = f.cols[f.order[0]].length;
  return toCsv(f.order, Array.from({ length: n }, (_, i) => f.order.map((c) => f.cols[c][i])));
}

const KEY_VARS = ['xgap', 'U', 'PI', 'PIE', 'RF', 'R10', 'rfstar', 'rbar10', 'D_pct_GDP', 'NI', 'rbudp_star', 'GDP'];

/** The Shiny "Export to CSV" file: key variables, baseline / scenario / deviation. */
export function keyVariablesCsv(r) {
  const header = ['fy_label',
    ...KEY_VARS.map((v) => `baseline_${v}`),
    ...KEY_VARS.map((v) => `scenario_${v}`),
    ...KEY_VARS.map((v) => `d_${v}`)];
  const rows = r.baseline.cols.fy_label.map((fy, i) => [fy,
    ...KEY_VARS.map((v) => r.baseline.cols[v][i]),
    ...KEY_VARS.map((v) => r.scenario.cols[v][i]),
    ...KEY_VARS.map((v) => r.deviations.cols[`d_${v}`][i])]);
  return toCsv(header, rows);
}

export function parametersCsv(params) {
  return toCsv(['Parameter', 'Value'], Object.entries(params));
}

export function userDeltasCsv(deltas) {
  const header = ['FY', ...EXPORT_ORDER.map((k) => INPUT_BY_KEY[k].exportName)];
  const rows = FY_LABELS.map((fy, i) => [fy, ...EXPORT_ORDER.map((k) => deltas[k][i])]);
  return toCsv(header, rows);
}

export { isNA };
