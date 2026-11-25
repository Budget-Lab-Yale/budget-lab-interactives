/* ===========================================================================
 * BLSMM interactive — app shell. Holds the scenario state, reruns the model
 * on every edit (it solves in about a millisecond), and redraws the results.
 *
 * The model is the vendored JS port in vendor/blsmm-model/ (pinned to a
 * commit of Budget-Lab-Small-Macro-Model, where CI holds it to the R model).
 * =========================================================================== */

import { simulate, OUTPUT_COLUMNS } from './vendor/blsmm-model/blsmm-model.js?v=32b8b8eb61';
import {
  INPUTS, PRESETS, SHAPES, buildShapeDelta, zeroInputDeltas, toModelDeltas, presetDeltas, hasNonZero,
} from './inputs.js?v=32b8b8eb61';
import {
  deriveResults, kpis, multiplierText, deviationSummaryText, deviationTable, summaryTable,
  outlaysIndirectText, primaryBalanceDerivedText, rfstarIndirectText, scenarioNote, scenarioStatus,
} from './results.js?v=32b8b8eb61';
import { LEVEL_CHARTS, DEV_CHARTS, createChartGrid } from './charts.js?v=32b8b8eb61';
import { createBuilder } from './builder.js?v=32b8b8eb61';
import { downloadZip } from './export.js?v=32b8b8eb61';
import { encodeState, decodeState } from './share.js?v=32b8b8eb61';

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
let hostLink = null;
// Re-places an open Figures menu after the page changes height under it (set by setupFiguresMenu).
let refreshFiguresMenu = () => {};

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
  results.scenarioNote = scenarioNote(state.deltas, state.fast, state.activePreset);

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

  renderScenarioControls();
}

// The line under the scenario controls says what is running: a preset, the baseline, or the
// reader's own inputs.
function renderScenarioControls() {
  for (const btn of $('preset-list').children) {
    const on = btn.dataset.preset === state.activePreset;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
  const status = scenarioStatus(state.deltas, state.fast, state.activePreset);
  const custom = status.kind === 'custom';
  const builderBtn = $('open-builder');
  builderBtn.classList.toggle('is-active', custom);
  builderBtn.querySelector('span').textContent = custom ? 'Custom scenario (edit)' : 'Custom scenario';
  $('reset').disabled = status.kind === 'baseline';
  const strong = document.createElement('strong');
  strong.textContent = `${status.label}:`;
  $('scenario-desc').replaceChildren(strong, ` ${status.text}`);
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
  const failed = grids[view].render(results);
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
    state.deltas[key] = buildShapeDelta(shape, magnitude);
    state.activePreset = null;
    recompute();
  },
  onYear(key, i, value) {
    if (state.deltas[key][i] === value) return;
    state.deltas[key][i] = value;
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

// Embedded with the loader's data-deep-link, the host page sends its URL, and
// a copied link opens the article at "#<key>:<state>" instead of this page.
function requestHostLink() {
  if (window.parent === window) return;
  window.addEventListener('message', (e) => {
    if (e.source !== window.parent) return;
    const m = e.data;
    if (!m || m.type !== 'TBL_EMBED_HOST' || typeof m.url !== 'string' || !/^[a-z0-9-]+$/.test(m.key)) return;
    let u;
    try { u = new URL(m.url); } catch { return; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return;
    u.hash = '';
    hostLink = { url: u.href, key: m.key };
  });
  window.parent.postMessage({ type: 'TBL_EMBED_HOST_REQUEST' }, '*');
}

function shareUrl() {
  if (!hostLink) return location.href;
  const h = location.hash.replace(/^#/, '');
  return h ? `${hostLink.url}#${hostLink.key}:${h}` : hostLink.url;
}

async function copyLink() {
  const url = shareUrl();
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ctl-btn';
    btn.dataset.preset = p.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = p.label;
    btn.addEventListener('click', () => applyPreset(p));
    list.append(btn);
  }
  // On phones Custom scenario and Reset take the pill's height, which depends on how its labels
  // wrap, so the two read as equals (styles.css "Controls").
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--pill-h', `${list.getBoundingClientRect().height}px`);
  }).observe(list);
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
    $('figures-section').hidden = state.tab !== 'results';
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
      for (const view of ['levels', 'deviations']) {
        $(`view-${view}`).hidden = state.view !== view;
        $(`figure-picker-${view}`).hidden = state.view !== view;
      }
      updateFiguresButton();
      renderVisibleCharts();
      if (window.parentIFrame?.size) window.parentIFrame.size();
      refreshFiguresMenu();
    });
  }
}

// Figures: one checkbox per chart in each view. Hidden charts are not drawn;
// showing one redraws its view.
function setupFigurePickers() {
  const setShown = (view, cells, shown) => {
    for (const { cell, box } of cells) {
      cell.fig.hidden = !shown(cell);
      box.checked = !cell.fig.hidden;
    }
    $(`view-${view}`).querySelector('.figures-empty').hidden = cells.some(({ cell }) => !cell.fig.hidden);
    stale[view] = true;
    renderVisibleCharts();
    updateFiguresButton();
    if (window.parentIFrame?.size) window.parentIFrame.size();
    refreshFiguresMenu();
  };
  const pickers = {};
  for (const view of ['levels', 'deviations']) {
    const fieldset = $(`figure-picker-${view}`);
    pickers[view] = grids[view].cells.map((cell) => {
      const label = document.createElement('label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = true;
      label.append(box, ` ${cell.def.title.replace(/ deviation from baseline$/, '')}`);
      fieldset.append(label);
      return { cell, box };
    });
    for (const { cell, box } of pickers[view]) {
      box.addEventListener('change', () => setShown(view, pickers[view], (c) => (c === cell ? box.checked : !c.fig.hidden)));
    }
  }
  $('figures-all').addEventListener('click', () => setShown(state.view, pickers[state.view], () => true));
  $('figures-none').addEventListener('click', () => setShown(state.view, pickers[state.view], () => false));
  updateFiguresButton();
}

function updateFiguresButton() {
  const boxes = [...$(`figure-picker-${state.view}`).querySelectorAll('input')];
  $('figures-button').textContent = `Figures (${boxes.filter((b) => b.checked).length} of ${boxes.length})`;
}

// The Figures menu (toolbar and phone layouts; in the sidebar the checklist is always open).
// Placement matters in the embed: the frame is only as tall as the page, so a panel that runs
// past the end of the page would be cut off.
function setupFiguresMenu() {
  const menu = document.querySelector('.fig-menu');
  const button = $('figures-button');
  const panel = $('figures-panel');
  const shell = document.querySelector('.tracker-shell');
  const isOpen = () => menu.classList.contains('is-open');

  const place = () => {
    panel.style.marginLeft = '';
    shell.style.paddingBottom = '';
    if (isOpen()) {
      // Keep the panel inside the controls horizontally.
      const bar = document.querySelector('.tracker-sidebar').getBoundingClientRect();
      const r = panel.getBoundingClientRect();
      const over = r.right - (bar.right - 6);
      if (over > 0) panel.style.marginLeft = `${-Math.min(over, r.left - (bar.left + 6))}px`;
      // Make the page tall enough to hold it. Measure the body, as the embed's resizer does:
      // scrollHeight already counts the open panel (absolutely positioned overflow).
      const bs = getComputedStyle(document.body);
      const contentBottom = document.body.offsetHeight + parseFloat(bs.marginTop) + parseFloat(bs.marginBottom);
      const extra = panel.getBoundingClientRect().bottom + window.scrollY + 16 - contentBottom;
      if (extra > 0) shell.style.paddingBottom = `${parseFloat(getComputedStyle(shell).paddingBottom) + extra}px`;
    }
    if (window.parentIFrame?.size) window.parentIFrame.size();
    if (isOpen()) panel.scrollIntoView({ block: 'nearest' });
  };
  const setOpen = (open) => {
    if (open === isOpen()) return;
    menu.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    place();
  };

  button.addEventListener('click', () => setOpen(!isOpen()));
  $('figures-done').addEventListener('click', () => { setOpen(false); button.focus(); });
  document.addEventListener('click', (e) => { if (isOpen() && !menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); button.focus(); }
  });
  window.addEventListener('resize', () => { if (isOpen()) place(); });
  // Hiding or showing figures, or switching view, changes the page's height under an open panel.
  refreshFiguresMenu = () => { if (isOpen()) requestAnimationFrame(place); };
  // Widening into the sidebar layout hides the button: close the menu so no padding is left behind.
  new ResizeObserver(() => { if (isOpen() && !button.offsetParent) setOpen(false); }).observe(shell);
}

// One "?" popover open at a time. A mouse opens it on hover; a click (or tap, or Enter) toggles it
// and pins a hovered one open. Outside click or Escape closes it.
function setupInfoPopovers() {
  let seq = 0;
  let hoverTimer = null;
  const isOpen = (t) => t.getAttribute('aria-expanded') === 'true';
  const close = (t) => {
    t.setAttribute('aria-expanded', 'false');
    delete t.dataset.hover;
    t.parentElement.querySelector('.info-pop')?.remove();
  };
  const closeAll = (except) => {
    for (const b of document.querySelectorAll('.info-trigger[aria-expanded="true"]')) {
      if (b !== except) close(b);
    }
  };
  const open = (trigger) => {
    closeAll(trigger);
    if (isOpen(trigger)) return;
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
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.info-trigger');
    if (trigger) {
      if (isOpen(trigger) && trigger.dataset.hover) delete trigger.dataset.hover;
      else if (isOpen(trigger)) close(trigger);
      else open(trigger);
      return;
    }
    if (!e.target.closest('.info-pop')) closeAll(null);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(null); });

  // Hover: the trigger and its popover count as one area, so the pointer can move onto the text.
  const area = (node) => node?.closest?.('.info-trigger, .info-pop');
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const hit = area(e.target);
    if (!hit) return;
    clearTimeout(hoverTimer);
    const trigger = hit.classList.contains('info-trigger') ? hit : hit.previousElementSibling;
    if (trigger?.classList.contains('info-trigger') && !isOpen(trigger)) {
      open(trigger);
      trigger.dataset.hover = '1';
    }
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const from = area(e.target);
    if (!from) return;
    const to = area(e.relatedTarget);
    if (to && to.parentElement === from.parentElement) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      for (const b of document.querySelectorAll('.info-trigger[data-hover]')) close(b);
    }, 150);
  });
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
  setupFigurePickers();
  setupFiguresMenu();

  document.querySelector('.skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    $('main-content').focus();
  });
  $('reset').addEventListener('click', reset);
  $('download-zip').addEventListener('click', () => downloadZip(results, state.deltas));
  $('copy-link').addEventListener('click', copyLink);
  requestHostLink();
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
