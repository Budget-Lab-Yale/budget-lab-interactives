/* ===========================================================================
 * BLSMM interactive — app shell. Holds the scenario state, reruns the model
 * on every edit (it solves in about a millisecond), and redraws the results.
 *
 * The model is the vendored JS port in vendor/blsmm-model/ (pinned to a
 * commit of Budget-Lab-Small-Macro-Model, where CI holds it to the R model).
 * =========================================================================== */

import { simulate, OUTPUT_COLUMNS } from './vendor/blsmm-model/blsmm-model.js?v=d2006366bb';
import {
  INPUTS, PRESETS, SHAPES, buildShapeDelta, zeroInputDeltas, toModelDeltas, presetDeltas, hasNonZero,
} from './inputs.js?v=d2006366bb';
import {
  deriveResults, kpis, multiplierText, deviationSummaryText, deviationTable, summaryTable,
  outlaysIndirectText, primaryBalanceDerivedText, rfstarIndirectText,
} from './results.js?v=d2006366bb';
import { LEVEL_CHARTS, DEV_CHARTS, createChartGrid } from './charts.js?v=d2006366bb';
import { createBuilder } from './builder.js?v=d2006366bb';
import { downloadZip } from './export.js?v=d2006366bb';
import { roundDelta } from './format.js?v=d2006366bb';
import { encodeState, decodeState } from './share.js?v=d2006366bb';

const ASSET_V = new URL(import.meta.url).searchParams.get('v') || '';
const $ = (id) => document.getElementById(id);

const defaultShapes = () => Object.fromEntries(INPUTS.map((i) => [i.key, { shape: (i.shapes ?? SHAPES)[0].id, magnitude: '0' }]));

const state = {
  deltas: zeroInputDeltas(),
  fast: false,
  activePreset: null,
  shapes: defaultShapes(),
  view: 'levels',
  tab: 'results',
};

let data;
let baseSim;
let results;
let builder;
const grids = {};
const stale = { levels: true, deviations: true };
let chartTimer = null;
let announceTimer = null;
let lastHash = null;

// --------------------------------------------------------------------------
// Recompute + render
// --------------------------------------------------------------------------

function recompute({ announce = true } = {}) {
  let scen;
  try {
    scen = simulate(data, { deltas: toModelDeltas(state.deltas), fastExpectations: state.fast });
  } catch (e) {
    console.error(e);
    showWarning(`Simulation error: ${e.message}`);
    return;
  }
  // The Shiny app had no shock specification until a scenario was run.
  const shock = !hasNonZero(state.deltas) && !state.fast
    ? null
    : Object.fromEntries(INPUTS.map((i) => [i.key, state.deltas[i.key].slice()]));
  results = deriveResults(data, baseSim.columns, scen.columns, OUTPUT_COLUMNS, shock);

  showWarning(scen.summary.overall_converged ? '' :
    `The model did not converge for this scenario (SSE: ${scen.summary.final_sse.toExponential(2)}). Treat these results with caution.`);
  renderPanels();
  stale.levels = true;
  stale.deviations = true;
  clearTimeout(chartTimer);
  chartTimer = setTimeout(renderVisibleCharts, 120);
  writeHash();
  if (announce) scheduleAnnouncement();
}

function showWarning(text) {
  const w = $('solver-warning');
  w.textContent = text;
  w.hidden = !text;
}

function renderPanels() {
  const k = kpis(results);
  $('kpi-final-debt').textContent = k.finalDebt;
  $('kpi-max-unemployment').textContent = k.maxUnemployment;

  renderTable($('deviation-table'), deviationTable(results), (cell) => `sign-${cell.sign}`);
  $('multiplier-text').textContent = multiplierText(results);
  $('deviation-summary-text').textContent = deviationSummaryText(results);

  const summary = summaryTable(state.deltas);
  renderTable($('summary-table-tab'), summary, (cell) => (cell.nonzero ? 'is-nonzero' : ''));
  renderTable(builder.summaryTable, summary, (cell) => (cell.nonzero ? 'is-nonzero' : ''));

  builder.sync(state, {
    outlaysIndirect: outlaysIndirectText(results),
    primaryBalance: primaryBalanceDerivedText(results, state.deltas),
    rfstarIndirect: rfstarIndirectText(results),
  });

  for (const btn of document.querySelectorAll('.btn-preset')) {
    const on = btn.dataset.preset === state.activePreset;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
  $('open-builder').classList.toggle('is-active', !state.activePreset && hasNonZero(state.deltas));
}

function renderTable(table, model, cellClass) {
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  model.header.forEach((h) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = h;
    hr.append(th);
  });
  thead.append(hr);
  const tbody = document.createElement('tbody');
  for (const row of model.rows) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = row.label;
    tr.append(th);
    for (const cell of row.cells) {
      const td = document.createElement('td');
      td.textContent = cell.text;
      const cls = cellClass(cell);
      if (cls) td.className = cls;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.replaceChildren(thead, tbody);
}

// Charts mount only into a visible view: the engine sizes them from their
// container, which is zero-width while hidden.
function renderVisibleCharts() {
  if (state.tab !== 'results' || !results) return 0;
  const view = state.view;
  if (!stale[view]) return 0;
  const failed = grids[view](results);
  stale[view] = false;
  if (window.parentIFrame?.size) window.parentIFrame.size();
  return failed;
}

function scheduleAnnouncement() {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    const k = kpis(results);
    $('results-status').textContent = `Results updated. Final debt impact ${k.finalDebt}. Max unemployment effect ${k.maxUnemployment}.`;
  }, 800);
}

// --------------------------------------------------------------------------
// Scenario edits
// --------------------------------------------------------------------------

function applyScenario({ deltas, fast, activePreset }) {
  state.deltas = deltas;
  state.fast = fast;
  state.activePreset = activePreset;
}

function applyPreset(preset) {
  applyScenario({ deltas: presetDeltas(data, preset), fast: state.fast, activePreset: preset.id });
  recompute();
}

function reset() {
  applyScenario({ deltas: zeroInputDeltas(), fast: false, activePreset: null });
  state.shapes = defaultShapes();
  recompute();
}

const builderCallbacks = {
  onShape(key, shape, magnitude) {
    state.shapes[key] = { shape, magnitude };
    state.deltas[key] = buildShapeDelta(shape, magnitude).map(roundDelta);
    state.activePreset = null;
    recompute();
  },
  onYear(key, i, value) {
    const v = roundDelta(value);
    if (state.deltas[key][i] === v) return;
    state.deltas[key][i] = v;
    state.activePreset = null;
    recompute();
  },
  onFast(checked) {
    state.fast = checked;
    state.activePreset = null;
    recompute();
  },
};

// --------------------------------------------------------------------------
// Shareable URL
// --------------------------------------------------------------------------

function writeHash() {
  const h = encodeState(state);
  lastHash = h;
  const url = `${location.pathname}${location.search}${h ? `#${h}` : ''}`;
  history.replaceState(null, '', url);
}

function readHash() {
  const decoded = decodeState(location.hash, data);
  applyScenario(decoded ?? { deltas: zeroInputDeltas(), fast: false, activePreset: null });
}

async function copyLink() {
  const url = location.href;
  const status = $('copy-status');
  const field = $('share-url');
  let ok = false;
  try {
    await navigator.clipboard.writeText(url);
    ok = true;
  } catch {
    // Embedded without clipboard-write permission: fall back to a selection copy.
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  if (ok) {
    field.hidden = true;
    status.textContent = 'Link copied.';
    setTimeout(() => { if (status.textContent === 'Link copied.') status.textContent = ''; }, 4000);
  } else {
    field.value = url;
    field.hidden = false;
    field.select();
    status.textContent = 'Copy this link:';
  }
}

// --------------------------------------------------------------------------
// UI wiring
// --------------------------------------------------------------------------

function buildPresets() {
  const list = $('preset-list');
  for (const p of PRESETS) {
    const row = document.createElement('div');
    row.className = 'preset-row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-preset';
    btn.dataset.preset = p.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = p.label;
    btn.addEventListener('click', () => applyPreset(p));
    const wrap = document.createElement('span');
    wrap.className = 'info-wrap';
    const info = document.createElement('button');
    info.type = 'button';
    info.className = 'info-trigger';
    info.setAttribute('aria-label', `About ${p.label}`);
    info.setAttribute('aria-expanded', 'false');
    info.dataset.info = p.description;
    info.textContent = '?';
    wrap.append(info);
    row.append(btn, wrap);
    list.append(row);
  }
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('.tracker-tab')];
  const select = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    }
    state.tab = tab.id.replace('tab-', '');
    if (focus) tab.focus();
    renderVisibleCharts();
    if (window.parentIFrame?.size) window.parentIFrame.size();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t, false));
    t.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); select(tabs[(i + step + tabs.length) % tabs.length], true); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
}

function setupViewToggle() {
  for (const radio of document.querySelectorAll('input[name="view"]')) {
    radio.addEventListener('change', () => {
      state.view = radio.value;
      for (const r of document.querySelectorAll('input[name="view"]')) {
        r.closest('label').classList.toggle('is-active', r.checked);
      }
      $('view-levels').hidden = state.view !== 'levels';
      $('view-deviations').hidden = state.view !== 'deviations';
      renderVisibleCharts();
      if (window.parentIFrame?.size) window.parentIFrame.size();
    });
  }
}

// One "?" popover open at a time; outside click or Escape closes it.
function setupInfoPopovers() {
  const closeAll = (except) => {
    for (const b of document.querySelectorAll('.info-trigger[aria-expanded="true"]')) {
      if (b === except) continue;
      b.setAttribute('aria-expanded', 'false');
      b.parentElement.querySelector('.info-pop')?.remove();
    }
  };
  let seq = 0;
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.info-trigger');
    if (trigger) {
      closeAll(trigger);
      if (trigger.getAttribute('aria-expanded') === 'true') {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.parentElement.querySelector('.info-pop')?.remove();
        return;
      }
      // Toggletip: insert an empty live region, then fill it, so screen
      // readers announce the text.
      const pop = document.createElement('span');
      pop.className = 'info-pop';
      pop.id = `info-pop-${++seq}`;
      pop.setAttribute('role', 'status');
      trigger.after(pop);
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-controls', pop.id);
      setTimeout(() => { pop.textContent = trigger.dataset.info; }, 50);
      return;
    }
    if (!e.target.closest('.info-pop')) closeAll(null);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(null); });
}

function setupBuilder() {
  const dialog = $('builder');
  builder = createBuilder(dialog, $('builder-body'), data, builderCallbacks);
  $('open-builder').addEventListener('click', () => builder.open());
  $('close-builder').addEventListener('click', () => dialog.close());
  // Backdrop clicks land on the dialog element itself, but so do clicks in the
  // drawer's empty space below short content: close only outside its box.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });
}

async function boot() {
  const res = await fetch(`vendor/blsmm-model/model-data.json${ASSET_V ? `?v=${ASSET_V}` : ''}`);
  if (!res.ok) throw new Error(`Could not load model data (${res.status})`);
  data = await res.json();
  baseSim = simulate(data);

  buildPresets();
  setupBuilder();
  setupTabs();
  setupViewToggle();
  setupInfoPopovers();
  grids.levels = createChartGrid($('grid-levels'), LEVEL_CHARTS, 'level');
  grids.deviations = createChartGrid($('grid-deviations'), DEV_CHARTS, 'dev');

  document.querySelector('.skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    $('main-content').focus();
  });
  $('reset').addEventListener('click', reset);
  $('download-zip').addEventListener('click', () => downloadZip(results, state.deltas));
  $('copy-link').addEventListener('click', copyLink);
  // Same-page links (the skip link) also change the hash: only a hash that
  // holds a scenario, or an emptied one, replaces the current scenario.
  window.addEventListener('hashchange', () => {
    const h = location.hash.replace(/^#/, '');
    if (h === lastHash) return;
    if (h && !decodeState(h, data)) { writeHash(); return; }
    readHash();
    state.shapes = defaultShapes();
    recompute();
  });

  readHash();
  recompute({ announce: false });
  clearTimeout(chartTimer);
  if (!window.BudgetLabChart) throw new Error('chart engine not loaded');
  const failed = renderVisibleCharts();
  if (failed) throw new Error(`${failed} charts failed to render`);
  // ci/smoke.json asserts this: set only once the model has run and every chart rendered.
  document.documentElement.dataset.blsmmReady = 'true';
}

boot().catch((e) => {
  console.error(e);
  showWarning(`The model could not be loaded: ${e.message}`);
});
