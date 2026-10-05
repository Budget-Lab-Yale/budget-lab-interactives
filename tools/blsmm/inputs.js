/* ===========================================================================
 * The nine scenario inputs, their shapes, and the presets — ported from the
 * Shiny app (app/R/blsmm_ui.R, blsmm_helpers.R, blsmm_server.R in
 * Budget-Lab-Small-Macro-Model). Every input is a 10-year path of deltas from
 * baseline, FY2026-FY2035.
 * =========================================================================== */

export const N_YEARS = 10;
export const FIRST_YEAR = 2026;
export const YEARS = Array.from({ length: N_YEARS }, (_, i) => FIRST_YEAR + i);
export const FY_LABELS = YEARS.map((y) => `FY${y}`);

export const SHAPES = [
  { id: 'onetime', label: 'One-time (year 1)' },
  { id: 'temporary3', label: 'Temporary (3 years)' },
  { id: 'permanent', label: 'Permanent shift' },
  { id: 'ramp', label: 'Linear ramp (0 → magnitude)' },
];
// Shocks are transient by nature, so only the pulse shapes are offered.
export const SHOCK_SHAPES = SHAPES.slice(0, 2);

/**
 * key: the input's id in this tool and in shared links.
 * delta: the model's user_delta_* path it feeds.
 * baseline: where its baseline row comes from (forecast_exog / forecast_resid).
 */
export const INPUTS = [
  {
    key: 'productivity', section: 'growth', delta: 'user_delta_prod',
    baseline: ['forecast_exog', 'glqstar'],
    label: 'Potential Productivity Growth Delta (pp)', units: 'pp',
    example: '<strong>Example:</strong> +0.20 raises productivity growth by 0.2 pp/year.',
    summaryLabel: 'Productivity Growth (pp)', exportName: 'Productivity',
  },
  {
    key: 'lf_growth', section: 'growth', delta: 'user_delta_lf',
    baseline: ['forecast_exog', 'glfstar'],
    label: 'Potential Labor Force Growth Delta (pp)', units: 'pp',
    example: '<strong>Example:</strong> +0.10 raises labor force growth by 0.1 pp/year.',
    summaryLabel: 'Labor Force Growth (pp)', exportName: 'LF_Growth',
  },
  {
    key: 'receipts', section: 'fiscal', delta: 'user_delta_rgfr',
    baseline: ['forecast_exog', 'rgfr_star'],
    label: 'Federal Receipts Delta (pp of GDP)', units: 'pp of GDP',
    example: '<strong>Example:</strong> +1.00 = tax increase of 1% of GDP; -1.00 = tax cut.',
    summaryLabel: 'Receipts (pp of GDP)', exportName: 'Receipts',
  },
  {
    key: 'outlays', section: 'fiscal', delta: 'user_delta_rgfop',
    baseline: ['forecast_exog', 'rgfop_star'],
    label: 'Federal Primary Outlays Delta (pp of GDP)', units: 'pp of GDP',
    example: '<strong>Example:</strong> +1.00 = spending increase of 1% of GDP; -1.00 = spending cut.<br><em>Primary outlays exclude interest payments on the debt.</em>',
    summaryLabel: 'Primary Outlays (pp of GDP)', exportName: 'Outlays',
  },
  {
    key: 'rfstar', section: 'monetary', delta: 'user_delta_rfstar_direct',
    baseline: ['forecast_exog', 'rfstar'],
    label: 'Neutral Rate (r*) Delta (pp)', units: 'pp',
    example: '<strong>Example:</strong> +0.25 raises r* by 0.25 pp; -0.25 lowers it.',
    summaryLabel: 'Real r* (Direct) (pp)', exportName: 'RFstar_Direct',
  },
  {
    key: 'inflation_target', section: 'monetary', delta: 'user_delta_pistar',
    baseline: ['forecast_exog', 'pistar'],
    label: 'Inflation Target Delta (pp)', units: 'pp',
    example: '<strong>Example:</strong> +0.50 = Fed raises target from 2.0% to 2.5%.',
    summaryLabel: 'Inflation Target (pp)', exportName: 'Inflation_Target',
  },
  {
    key: 'monetary_rule', section: 'monetary', delta: 'user_delta_MPshock',
    baseline: ['forecast_resid', 'epsrf'],
    label: 'Fed Interest Rate Adjustment (pp)', units: 'pp',
    example: 'Sets Fed Funds higher or lower than the rule-based path. <strong>Example:</strong> +0.50 = 0.5 pp above normal; -0.50 = 0.5 pp below.',
    summaryLabel: 'Monetary Rule Shock (pp)', exportName: 'MP_Rule_Shock',
  },
  {
    key: 'output_gap', section: 'monetary', delta: 'user_delta_ADshock',
    baseline: ['forecast_resid', 'epsxgap'],
    label: 'Output Gap Shock (pp)', units: 'pp',
    example: 'Private demand shocks (confidence, wealth effects). <strong>Example:</strong> +2.00 = output 2 pp above potential.',
    summaryLabel: 'Output Gap Shock (pp)', exportName: 'Output_Gap_Shock',
  },
  {
    key: 'inflation_shock', section: 'monetary', delta: 'user_delta_inflshock',
    baseline: ['forecast_resid', 'epspi'],
    label: 'Unexpected Inflation Shock (pp)', units: 'pp',
    example: 'Temporary supply shocks (oil prices, pandemic disruptions). <strong>Example:</strong> +1.00 = inflation 1 pp above baseline that year.',
    summaryLabel: 'Inflation Shock (pp)', exportName: 'Inflation_Shock',
    shapes: SHOCK_SHAPES,
  },
];

export const INPUT_BY_KEY = Object.fromEntries(INPUTS.map((i) => [i.key, i]));

// Row order of the All Deltas Summary table (Scenario Summary tab).
export const SUMMARY_ORDER = [
  'lf_growth', 'productivity', 'receipts', 'outlays', 'rfstar',
  'inflation_target', 'output_gap', 'inflation_shock', 'monetary_rule',
];

// Column order of the User Deltas export.
export const EXPORT_ORDER = [
  'lf_growth', 'productivity', 'receipts', 'outlays', 'rfstar',
  'output_gap', 'inflation_shock', 'monetary_rule', 'inflation_target',
];

export const SECTIONS = [
  {
    id: 'growth', title: 'Growth & Productivity',
    intro: '<strong>What this does:</strong> Adjust long-run growth via labor force and productivity. Changes here automatically affect r* and government spending. Productivity is defined as real GDP per employed person.',
  },
  {
    id: 'fiscal', title: 'Fiscal Policy',
    intro: '<strong>What this does:</strong> Simulate tax and spending policies by changing federal receipts and primary outlays as a percent of GDP. Positive values raise receipts or outlays; negative values cut.',
  },
  {
    id: 'monetary', title: 'Monetary & Shocks',
    intro: '<strong>What this does:</strong> Override the neutral rate, the Fed’s inflation target or rate path, or apply demand and inflation shocks.',
  },
];

/** model: the preset's id in model-data.json (its scenarios/inputs/ file). */
export const PRESETS = [
  {
    id: 'rapid_ai', model: 'ai_s2_prod_lf', label: 'AI Adoption',
    description: 'Productivity boost + labor-force participation decline (Karger et al.).',
  },
  {
    id: 'persistent_infl', model: 'alt_persistent_inflation', label: 'Persistent Inflation',
    description: 'Inflation shock peaking at +0.3 pp in FY2028, returning to baseline by FY2030.',
  },
  {
    id: 'military_conflict', model: 'alt_military_conflict', label: 'Higher Defense Spending',
    description: 'Defense outlays rise per BR2027, including a +$350B mandatory bump in FY2027.',
  },
];

/** build_shape_delta(): a shape + magnitude as a 10-year delta path. */
export function buildShapeDelta(shape, magnitude, n = N_YEARS) {
  const m = Number(magnitude);
  if (magnitude === null || magnitude === '' || !Number.isFinite(m)) return new Array(n).fill(0);
  switch (shape) {
    case 'permanent': return new Array(n).fill(m);
    case 'onetime': return Array.from({ length: n }, (_, i) => (i === 0 ? m : 0));
    case 'temporary3': return Array.from({ length: n }, (_, i) => (i < 3 ? m : 0));
    // R's seq(0, m, length.out = n): evenly spaced, last element exactly m.
    case 'ramp': return Array.from({ length: n }, (_, i) => (i === n - 1 ? m : i * (m / (n - 1))));
    default: return new Array(n).fill(0);
  }
}

export function zeroInputDeltas() {
  return Object.fromEntries(INPUTS.map((i) => [i.key, new Array(N_YEARS).fill(0)]));
}

/** Tool-side deltas (keyed by input) -> the model's user_delta_* paths. */
export function toModelDeltas(deltas) {
  return Object.fromEntries(INPUTS.map((i) => [i.delta, deltas[i.key].slice()]));
}

/** A preset's deltas from model-data.json, keyed by input; unlisted inputs are zero. */
export function presetDeltas(modelData, preset) {
  const src = modelData.presets[preset.model]?.user_deltas;
  if (!src) throw new Error(`Preset ${preset.model} missing from model data`);
  const out = zeroInputDeltas();
  for (const input of INPUTS) {
    const path = src[input.delta];
    if (!path) continue;
    // update_table_with_shocks(): pad short paths with zeros, drop the excess.
    out[input.key] = Array.from({ length: N_YEARS }, (_, i) => Number(path[i] ?? 0));
  }
  return out;
}

export function baselinePath(modelData, input) {
  const [table, col] = input.baseline;
  return modelData[table][col].slice(0, N_YEARS);
}

export function hasNonZero(deltas) {
  return INPUTS.some((i) => deltas[i.key].some((v) => Math.abs(v) > 1e-9));
}
