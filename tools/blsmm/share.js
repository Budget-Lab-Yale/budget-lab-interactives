/* ===========================================================================
 * Shareable links: the scenario lives in the URL hash.
 *   #preset=rapid_ai&fast=1              an unedited preset
 *   #receipts=1,1,1&outlays=0,0.5&fast=1 any other scenario; each input's
 *                                        path, trailing zeros dropped
 * An empty hash is the baseline. Pure, so ci/ tests can exercise it.
 * =========================================================================== */

import { INPUTS, INPUT_BY_KEY, PRESETS, N_YEARS, zeroInputDeltas, presetDeltas } from './inputs.js?v=782a1bb3ec';

export function encodeState(state) {
  const p = new URLSearchParams();
  if (state.activePreset) {
    p.set('preset', state.activePreset);
  } else {
    for (const input of INPUTS) {
      const path = state.deltas[input.key];
      let end = path.length;
      while (end > 0 && path[end - 1] === 0) end--;
      if (end > 0) p.set(input.key, path.slice(0, end).map(String).join(','));
    }
  }
  if (state.fast) p.set('fast', '1');
  // URLSearchParams escapes "," and "*"; neither needs it in a fragment.
  return p.toString().replace(/%2C/g, ',');
}

/** Parse a hash (with or without "#"). Returns null when it holds no scenario. */
export function decodeState(hash, modelData) {
  const p = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const fast = p.get('fast') === '1';
  const presetId = p.get('preset');
  const preset = PRESETS.find((x) => x.id === presetId);
  if (preset) return { deltas: presetDeltas(modelData, preset), fast, activePreset: preset.id };

  const deltas = zeroInputDeltas();
  let any = fast;
  for (const [key, raw] of p) {
    if (!Object.hasOwn(INPUT_BY_KEY, key)) continue;
    const vals = raw.split(',').slice(0, N_YEARS).map((s) => (s.trim() === '' ? 0 : Number(s)));
    if (!vals.every(Number.isFinite)) continue;
    deltas[key] = Array.from({ length: N_YEARS }, (_, i) => vals[i] ?? 0);
    any = true;
  }
  return any ? { deltas, fast, activePreset: null } : null;
}
