/* ===========================================================================
 * The 12 Levels charts and 8 Deviations charts, ported from
 * app/R/blsmm_plots_v1_8.R and the dev_plot_* outputs in blsmm_server.R.
 *
 * Levels charts plot FY2025 (history) to FY2035, baseline dashed and scenario
 * solid in the same colour. When the scenario equals the baseline only the
 * baseline is drawn, solid. Two-variable charts use blue for the first
 * variable and amber for the second. Deviations charts plot FY2026-FY2035.
 *
 * chartData() and the definitions are pure; mountCharts() needs the vendored
 * engine (window.BudgetLabChart).
 * =========================================================================== */

import { srLevelDesc, srDevDesc, isNA } from './results.js?v=782a1bb3ec';

const pctOfGdp = (num, den) => (c, i) => (c[num][i] / c[den][i]) * 100;
const potentialToActual = (col) => (c, i) => c[col][i] * (c.GDPstar[i] / c.GDP[i]);

const FIG = 'baseline versus scenario, FY2026–FY2035.';

export const LEVEL_CHARTS = [
  {
    id: 'plot_budget_balance', title: 'Budget deficit', subtitle: 'Percent of GDP (positive = deficit)',
    suffix: '%', decimals: 2,
    vars: [{ value: (c, i) => (c.BUD[i] / c['GDP$'][i]) * -100 }],
    caption: `Chart: Total budget deficit as percent of GDP, ${FIG}`,
    sr: { decimals: 2, unit: '% of GDP', label: 'Total budget deficit' },
  },
  {
    id: 'plot_debt', title: 'Debt held by the public', subtitle: 'Percent of GDP',
    suffix: '%', decimals: 1,
    vars: [{ value: (c, i) => c.D_pct_GDP[i] }],
    caption: `Chart: Federal debt held by the public as percent of GDP, ${FIG}`,
    sr: { decimals: 1, unit: '% of GDP', label: 'Federal debt held by the public' },
  },
  {
    id: 'plot_avg_interest_rate', title: 'Average interest rate on federal debt', subtitle: 'Percent',
    suffix: '%', decimals: 2,
    vars: [{ value: (c, i) => c.RG[i] }],
    caption: `Chart: Average interest rate on federal debt, ${FIG}`,
    sr: { decimals: 2, unit: ' percent', label: 'Average interest rate on federal debt' },
  },
  {
    id: 'plot_total_receipts', title: 'Total receipts', subtitle: 'Percent of GDP',
    suffix: '%', decimals: 2,
    vars: [{ value: potentialToActual('rgfr_star') }],
    caption: `Chart: Total federal receipts as percent of GDP, ${FIG}`,
    sr: { decimals: 2, unit: '% of GDP', label: 'Total federal receipts' },
  },
  {
    id: 'plot_total_outlays', title: 'Total outlays', subtitle: 'Percent of GDP',
    suffix: '%', decimals: 2,
    vars: [{ value: (c, i) => potentialToActual('rgfop_star')(c, i) + pctOfGdp('NI', 'GDP$')(c, i) }],
    caption: `Chart: Total federal outlays as percent of GDP, ${FIG}`,
    sr: { decimals: 2, unit: '% of GDP', label: 'Total federal outlays (including net interest)' },
  },
  {
    id: 'plot_unemployment', title: 'Unemployment rate', subtitle: 'Percent',
    suffix: '%', decimals: 2,
    vars: [{ value: (c, i) => c.U[i] }],
    caption: `Chart: Unemployment rate, ${FIG}`,
    sr: { decimals: 2, unit: ' percent', label: 'Unemployment rate' },
  },
  {
    id: 'plot_inflation', title: 'Inflation', subtitle: 'Percent (GDP deflator)',
    suffix: '%', decimals: 2,
    vars: [{ value: (c, i) => c.PI[i] }],
    caption: `Chart: Inflation rate (GDP deflator), ${FIG}`,
    sr: { decimals: 2, unit: ' percent', label: 'Inflation rate' },
  },
  {
    id: 'plot_10yr_yield', title: '10-year Treasury yield', subtitle: 'Percent',
    suffix: '%', decimals: 2,
    vars: [
      { name: 'Nominal 10Y', value: (c, i) => c.R10[i] },
      { name: 'Real 10Y', value: (c, i) => c.R10[i] - c.PI[i] },
    ],
    caption: `Chart: 10-year Treasury yield (nominal and real), ${FIG}`,
    sr: { decimals: 2, unit: ' percent', label: 'Nominal 10-year Treasury yield', value: (c, i) => c.R10[i] },
  },
  {
    id: 'plot_federal_funds', title: 'Federal Funds rate', subtitle: 'Percent',
    suffix: '%', decimals: 2,
    // r* is the second (amber) variable but is listed first, as in the Shiny legend.
    vars: [
      { name: 'r*', value: (c, i) => c.rfstar[i], secondary: true },
      { name: 'Fed Funds', value: (c, i) => c.RF[i] },
    ],
    caption: `Chart: Federal Funds rate and neutral rate (r-star), ${FIG}`,
    sr: { decimals: 2, unit: ' percent', label: 'Federal Funds rate', value: (c, i) => c.RF[i] },
  },
  {
    id: 'plot_primary_outlays', title: 'Primary outlays', subtitle: 'Percent of GDP',
    suffix: '%', decimals: 2,
    vars: [{ value: potentialToActual('rgfop_star') }],
    caption: `Chart: Primary federal outlays (excluding net interest) as percent of GDP, ${FIG}`,
    sr: { decimals: 2, unit: '% of GDP', label: 'Primary federal outlays (excluding interest)' },
  },
  {
    id: 'plot_real_gdp_growth', title: 'Real GDP growth', subtitle: 'Percent',
    suffix: '%', decimals: 2, skipHistory: true,
    vars: [{ value: (c, i) => c.real_gdp_growth[i] }],
    caption: `Chart: Real GDP growth rate, ${FIG}`,
    sr: { decimals: 2, unit: ' percent', label: 'Real GDP growth rate' },
  },
  {
    id: 'plot_primary_balance', title: 'Primary budget deficit', subtitle: 'Percent of GDP (positive = deficit)',
    suffix: '%', decimals: 2,
    vars: [{ value: (c, i) => potentialToActual('rbudp_star')(c, i) * -1 }],
    caption: `Chart: Primary budget deficit as percent of GDP, ${FIG}`,
    sr: { decimals: 2, unit: '% of GDP', label: 'Primary budget deficit' },
  },
];

const DEV = '(percentage points), FY2026–FY2035.';
const DEV_GDP = '(percentage points of GDP), FY2026–FY2035.';

export const DEV_CHARTS = [
  {
    id: 'dev_plot_primary_balance', title: 'Primary balance deviation from baseline', subtitle: 'Percentage points of GDP',
    decimals: 2, name: 'Primary Balance Deviation',
    value: (r) => r.deviations.cols.d_rbudp_star,
    caption: `Chart: Primary budget deficit deviation from baseline ${DEV_GDP}`,
    sr: { unit: ' pp of GDP', label: 'Primary deficit deviation from baseline' },
  },
  {
    id: 'dev_plot_debt', title: 'Debt/GDP deviation from baseline', subtitle: 'Percentage points of GDP',
    decimals: 2, name: 'Debt/GDP Deviation',
    value: (r) => r.deviations.cols.d_D_pct_GDP,
    caption: `Chart: Debt-to-GDP deviation from baseline ${DEV_GDP}`,
    sr: { unit: ' pp of GDP', label: 'Debt-to-GDP deviation from baseline' },
  },
  {
    id: 'dev_plot_unemployment', title: 'Unemployment rate deviation from baseline', subtitle: 'Percentage points',
    decimals: 3, name: 'Unemployment Deviation',
    value: (r) => r.deviations.cols.d_U,
    caption: `Chart: Unemployment rate deviation from baseline ${DEV}`,
    sr: { unit: ' pp', label: 'Unemployment rate deviation from baseline' },
  },
  {
    id: 'dev_plot_inflation', title: 'Inflation rate deviation from baseline', subtitle: 'Percentage points',
    decimals: 3, name: 'Inflation Deviation',
    value: (r) => r.deviations.cols.d_PI,
    caption: `Chart: Inflation rate deviation from baseline ${DEV}`,
    sr: { unit: ' pp', label: 'Inflation rate deviation from baseline' },
  },
  {
    id: 'dev_plot_10yr_yield', title: '10-year Treasury yield deviation from baseline', subtitle: 'Percentage points',
    decimals: 2, name: '10-Year Yield Deviation',
    value: (r) => r.deviations.cols.d_R10,
    caption: `Chart: 10-year Treasury yield deviation from baseline ${DEV}`,
    sr: { unit: ' pp', label: '10-year Treasury yield deviation from baseline' },
  },
  {
    id: 'dev_plot_federal_funds', title: 'Federal Funds rate deviation from baseline', subtitle: 'Percentage points',
    decimals: 2, name: 'Federal Funds Rate Deviation',
    value: (r) => r.deviations.cols.d_RF,
    caption: `Chart: Federal Funds rate deviation from baseline ${DEV}`,
    sr: { unit: ' pp', label: 'Federal Funds rate deviation from baseline' },
  },
  {
    id: 'dev_plot_real_gdp_growth', title: 'Real GDP growth deviation from baseline', subtitle: 'Percentage points',
    decimals: 3, name: 'Real GDP Growth Deviation',
    value: (r) => r.deviations.cols.d_real_gdp_growth,
    caption: `Chart: Real GDP growth deviation from baseline ${DEV}`,
    sr: { unit: ' pp', label: 'Real GDP growth deviation from baseline' },
  },
  {
    // The Shiny output id was dev_plot_output_gap; it has always plotted the budget deficit.
    id: 'dev_plot_budget_deficit', title: 'Budget deficit deviation from baseline', subtitle: 'Percentage points of GDP',
    decimals: 2, name: 'Budget Deficit Deviation',
    value: (r) => {
      const b = r.baseline.cols;
      const s = r.scenario.cols;
      return b.BUD.map((_, i) => (s.BUD[i] / s['GDP$'][i]) * -100 - (b.BUD[i] / b['GDP$'][i]) * -100);
    },
    caption: `Chart: Budget deficit deviation from baseline ${DEV_GDP}`,
    sr: { unit: ' pp of GDP', label: 'Budget deficit deviation from baseline' },
  },
];

// Axis ticks read FY26; the hover card keeps the full FY2026.
const shortFy = (label) => `FY${label.slice(-2)}`;
const fullFyLabels = (labels) => Object.fromEntries(labels.map((l) => [shortFy(l), l]));

const PRIMARY = 'blue';
const SECONDARY = 'amber';

/** Spec + tidy rows for one Levels chart. */
export function levelChartData(def, r) {
  const b = r.baselineHist.cols;
  const s = r.scenarioHist.cols;
  const idx = b.fy_label.map((_, i) => i).filter((i) => !(def.skipHistory && i === 0));
  const rows = [];
  const order = [];
  const colors = {};
  const styles = {};
  const single = def.vars.length === 1;
  for (const v of def.vars) {
    const color = v.secondary ? SECONDARY : PRIMARY;
    const named = (suffix) => (single ? suffix : `${v.name} (${suffix})`);
    const lines = r.baselineOnly
      ? [[single ? 'Baseline' : v.name, b, false]]
      : [[named('Baseline'), b, true], [named('Scenario'), s, false]];
    for (const [name, cols, dashed] of lines) {
      order.push(name);
      colors[name] = color;
      if (dashed) styles[name] = { dashed: true };
      for (const i of idx) {
        const y = v.value(cols, i);
        rows.push({ year: shortFy(cols.fy_label[i]), series: name, value: isNA(y) ? '' : String(y) });
      }
    }
  }
  const spec = {
    chartType: 'line',
    title: def.title,
    subtitle: def.subtitle,
    xAxisType: 'categorical',
    data: 'data.csv',
    columns: { x: 'year', value: 'value', series: 'series' },
    x_order: idx.map((i) => shortFy(b.fy_label[i])),
    x_labels: fullFyLabels(idx.map((i) => b.fy_label[i])),
    series_order: order,
    series_colors: colors,
    value_suffix: def.suffix,
    tooltip_decimals: def.decimals,
  };
  if (Object.keys(styles).length) spec.series_styles = styles;
  return { spec, rows };
}

/** Spec + tidy rows for one Deviations chart. */
export function devChartData(def, r) {
  const fy = r.deviations.cols.fy_label;
  const vals = def.value(r);
  const rows = [];
  fy.forEach((label, i) => {
    // The real-GDP-growth deviation is undefined in FY2026 (no prior simulated year).
    if (!isNA(vals[i])) rows.push({ year: shortFy(label), value: String(vals[i]) });
  });
  const spec = {
    chartType: 'line',
    title: def.title,
    subtitle: def.subtitle,
    xAxisType: 'categorical',
    data: 'data.csv',
    columns: { x: 'year', value: 'value' },
    x_order: rows.map((row) => row.year),
    x_labels: fullFyLabels(fy),
    value_suffix: ' pp',
    tooltip_decimals: def.decimals,
    yAxisPolicy: { includeZero: true },
  };
  return { spec, rows };
}

export function levelDescription(def, r) {
  const b = r.baseline.cols;
  const s = r.scenario.cols;
  const value = def.sr.value ?? def.vars[0].value;
  const series = (c) => c.fy_label.map((_, i) => value(c, i));
  return srLevelDesc(series(b), series(s), b.fy_label, def.sr.decimals, def.sr.unit, def.sr.label);
}

export function devDescription(def, r) {
  return srDevDesc(def.value(r), r.deviations.cols.fy_label, def.sr.unit, def.sr.label);
}

// --------------------------------------------------------------------------
// DOM
// --------------------------------------------------------------------------

/** Build one <figure> per chart in `grid`; returns a render(r) function. */
export function createChartGrid(grid, defs, kind) {
  const engine = () => {
    const e = window.BudgetLabChart;
    if (!e) throw new Error('Chart engine bundle not loaded (window.BudgetLabChart missing).');
    return e;
  };
  const cells = defs.map((def) => {
    const fig = document.createElement('figure');
    fig.className = 'chart-cell';
    fig.setAttribute('aria-labelledby', `fig_${def.id}_label`);
    const cap = document.createElement('figcaption');
    cap.id = `fig_${def.id}_label`;
    cap.className = 'sr-only';
    cap.textContent = def.caption;
    const desc = document.createElement('p');
    desc.className = 'sr-only';
    const mount = document.createElement('div');
    mount.className = 'chart-mount';
    fig.append(cap, desc, mount);
    grid.appendChild(fig);
    return { def, desc, mount, teardown: null };
  });

  // Returns the number of charts that failed to render.
  return function render(r) {
    let failed = 0;
    for (const cell of cells) {
      const { def } = cell;
      if (cell.teardown) { try { cell.teardown(); } catch { /* engine teardown is best-effort */ } }
      cell.mount.replaceChildren();
      const { spec, rows } = kind === 'level' ? levelChartData(def, r) : devChartData(def, r);
      cell.desc.textContent = kind === 'level' ? levelDescription(def, r) : devDescription(def, r);
      try {
        cell.teardown = engine().mountChart(cell.mount, { spec, rows, downloadName: `blsmm-${def.id.replace(/^(dev_)?plot_/, '$1')}` });
      } catch (e) {
        console.error(e);
        cell.teardown = null;
        failed++;
        const err = document.createElement('div');
        err.className = 'figure-error';
        err.textContent = `Could not render: ${e.message}`;
        cell.mount.replaceChildren(err);
      }
    }
    return failed;
  };
}
