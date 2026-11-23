// =============================================================================
// Write a year-keyed reference table of the series the interactive displays,
// for the baseline and each preset in model-data.json.
// =============================================================================
// Run from the repository root:   node js/reference-values.mjs <output.csv>
//
// One row per scenario and fiscal year: the history year (data.history_year)
// and every forecast year. Values are JavaScript's shortest round-trip form of
// each double, so they parse back to the exact value js/blsmm-model.js
// produced. Presets run with standard expectations, as in run_scenario().
//
// Display definitions follow the Shiny app (app/R/blsmm_plots_v1_8.R):
//   debt_pct_gdp             D / GDP$ * 100
//   deficit_pct_gdp          -BUD / GDP$ * 100
//   primary_deficit_pct_gdp  -rbudp_star * GDPstar / GDP
//   receipts_pct_gdp         rgfr_star * GDPstar / GDP
//   primary_outlays_pct_gdp  rgfop_star * GDPstar / GDP
//   total_outlays_pct_gdp    primary_outlays_pct_gdp + net_interest_pct_gdp
//   net_interest_pct_gdp     NI / GDP$ * 100
//   real_gdp_growth          percent change in GDP from the previous year
//   unemployment U, inflation PI, fed_funds RF, r10 R10, avg_rate_on_debt RG
// The history-year row takes rgfr_star and rgfop_star from
// data.history_receipts_outlays and applies the same formulas, and takes real
// GDP growth from data.history_growth, which js/export-data.R computes from
// two years of one data vintage (the history file's previous-year row can be
// from an earlier vintage).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate } from './blsmm-model.js';

const outPath = process.argv[2];
if (!outPath) throw new Error('Usage: node js/reference-values.mjs <output.csv>');

const jsDir = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(jsDir, 'model-data.json'), 'utf8'));

for (const k of ['baseline_id', 'first_forecast_year', 'last_forecast_year', 'history_year', 'history_receipts_outlays', 'history_growth']) {
  if (data[k] === undefined) throw new Error(`model-data.json has no ${k}; run Rscript js/export-data.R`);
}

const VARIABLES = [
  'debt_pct_gdp', 'deficit_pct_gdp', 'primary_deficit_pct_gdp',
  'receipts_pct_gdp', 'primary_outlays_pct_gdp', 'total_outlays_pct_gdp',
  'net_interest_pct_gdp', 'real_gdp_growth',
  'unemployment', 'inflation', 'fed_funds', 'r10', 'avg_rate_on_debt',
];

function histRow(year) {
  const h = data.historical;
  const i = h.year.indexOf(year);
  if (i < 0) throw new Error(`historical has no row for ${year}`);
  const row = {};
  for (const [k, v] of Object.entries(h)) {
    if (v[i] === null) throw new Error(`historical ${k} is missing for ${year}`);
    row[k] = v[i];
  }
  return row;
}

// One display row from model-level values and the year's real GDP growth.
function displayRow(r, realGdpGrowth) {
  const potentialRatio = r.GDPstar / r.GDP;
  const niPct = r.NI / r['GDP$'] * 100;
  const receipts = r.rgfr_star * potentialRatio;
  const primaryOutlays = r.rgfop_star * potentialRatio;
  return {
    debt_pct_gdp: r.D / r['GDP$'] * 100,
    deficit_pct_gdp: -r.BUD / r['GDP$'] * 100,
    primary_deficit_pct_gdp: -r.rbudp_star * potentialRatio,
    receipts_pct_gdp: receipts,
    primary_outlays_pct_gdp: primaryOutlays,
    total_outlays_pct_gdp: primaryOutlays + niPct,
    net_interest_pct_gdp: niPct,
    real_gdp_growth: realGdpGrowth,
    unemployment: r.U,
    inflation: r.PI,
    fed_funds: r.RF,
    r10: r.R10,
    avg_rate_on_debt: r.RG,
  };
}

const scenarios = [['baseline', {}]];
for (const [id, p] of Object.entries(data.presets)) scenarios.push([id, p.user_deltas]);

const H = data.history_year;
const hro = data.history_receipts_outlays;
if (hro.year !== H) throw new Error(`history_receipts_outlays is for ${hro.year}, not history_year ${H}`);
const hist = { ...histRow(H), rgfr_star: hro.rgfr_star, rgfop_star: hro.rgfop_star };
const hg = data.history_growth;
if (hg.year !== H) throw new Error(`history_growth is for ${hg.year}, not history_year ${H}`);

const lines = [['baseline_id', 'scenario', 'fiscal_year', 'period', ...VARIABLES].join(',')];

for (const [name, deltas] of scenarios) {
  const { columns: c, summary } = simulate(data, { deltas });
  if (!summary.overall_converged) throw new Error(`${name} did not converge`);
  if (c.year[0] !== data.first_forecast_year || c.year[c.year.length - 1] !== data.last_forecast_year) {
    throw new Error(`${name}: simulated years ${c.year[0]}-${c.year[c.year.length - 1]} differ from the metadata`);
  }
  const rows = [[H, 'history', displayRow(hist, hg.real_gdp_growth)]];
  for (let i = 0; i < c.year.length; i++) {
    const r = {};
    for (const k of Object.keys(c)) r[k] = c[k][i];
    const prevGDP = i === 0 ? hist.GDP : c.GDP[i - 1];
    rows.push([c.year[i], 'forecast', displayRow(r, (r.GDP / prevGDP - 1) * 100)]);
  }
  for (const [year, period, d] of rows) {
    for (const v of VARIABLES) {
      if (!Number.isFinite(d[v])) throw new Error(`${name} ${year} ${v} is not finite`);
    }
    lines.push([data.baseline_id, name, year, period, ...VARIABLES.map((v) => String(d[v]))].join(','));
  }
}

writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`Wrote ${lines.length - 1} rows to ${outPath}`);
