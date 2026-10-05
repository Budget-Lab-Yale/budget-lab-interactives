/* ===========================================================================
 * "Download data (.zip)": the Shiny app's two exports in one archive.
 *   key_variables.csv  — the old "Export to CSV" file
 *   baseline.csv, scenario.csv, deviations.csv, parameters.csv,
 *   user_deltas.csv    — the old Excel workbook's five sheets
 * =========================================================================== */

import { zipStore } from './zip-store.js?v=d2006366bb';
import { keyVariablesCsv, frameCsv, parametersCsv, userDeltasCsv } from './results.js?v=d2006366bb';

export function exportFiles(r, deltas) {
  return [
    { name: 'key_variables.csv', data: keyVariablesCsv(r) },
    { name: 'baseline.csv', data: frameCsv(r.baseline) },
    { name: 'scenario.csv', data: frameCsv(r.scenario) },
    { name: 'deviations.csv', data: frameCsv(r.deviations) },
    { name: 'parameters.csv', data: parametersCsv(r.params) },
    { name: 'user_deltas.csv', data: userDeltasCsv(deltas) },
  ];
}

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function downloadZip(r, deltas) {
  const root = `BLSMM_simulation_${today()}`;
  const blob = zipStore(exportFiles(r, deltas).map((f) => ({ name: `${root}/${f.name}`, data: f.data })));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${root}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
