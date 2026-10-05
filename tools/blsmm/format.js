/* ===========================================================================
 * Number formatting that reproduces R's sprintf() output for the formats the
 * Shiny app used ("%.2f", "%+.2f", "%+.3f", ...), so ported text reads the
 * same. Missing values (null / NaN) print as R prints NA and NaN.
 * =========================================================================== */

function nonFinite(v) {
  if (v === null || v === undefined) return 'NA';
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return 'Inf';
  if (v === -Infinity) return '-Inf';
  return null;
}

/** sprintf("%.<d>f", v) */
export function fixed(v, d) {
  return nonFinite(v) ?? v.toFixed(d);
}

/** sprintf("%+.<d>f", v) */
export function signed(v, d) {
  const nf = nonFinite(v);
  if (nf !== null) return v === Infinity ? '+Inf' : nf;
  const neg = v < 0 || Object.is(v, -0);
  return (neg ? '-' : '+') + Math.abs(v).toFixed(d);
}

/** format_signed_delta() from the Shiny helpers: zero renders unsigned. */
export function signedDelta(v) {
  const x = Number(v);
  if (!Number.isFinite(x) || Math.abs(x) < 1e-12) return '0.00';
  return signed(x, 2);
}

/** Parse a user-typed delta the way the Shiny server did (as.numeric, else 0). */
export function parseDelta(raw) {
  const s = String(raw ?? '').trim();
  if (s === '') return 0;
  const x = Number(s);
  return Number.isFinite(x) ? x : 0;
}
