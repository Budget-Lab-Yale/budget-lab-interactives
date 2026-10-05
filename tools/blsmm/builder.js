/* ===========================================================================
 * Custom Scenario Builder drawer — ported from the Shiny offcanvas in
 * app/R/blsmm_ui.R and simple_input_card() / year_by_year_input_strip() in
 * blsmm_helpers.R. Three accordion sections of input cards (shape +
 * magnitude, with an "Edit year-by-year" strip), the calculated-effects
 * panels, the fast-expectations option and the All Deltas Summary table.
 *
 * The drawer owns no scenario state: edits go out through the callbacks and
 * sync() redraws from the app's state after every recompute.
 * =========================================================================== */

import { INPUTS, SECTIONS, SHAPES, YEARS, N_YEARS, baselinePath } from './inputs.js?v=782a1bb3ec';
import { fixed, signedDelta, parseDelta } from './format.js?v=782a1bb3ec';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

// Full-precision text for an input being edited: "+0.581", "-1", "0.00".
function editableDelta(v) {
  if (!v) return '0.00';
  return v > 0 ? `+${v}` : String(v);
}

function infoButton(label, text) {
  return el('span', { class: 'info-wrap' },
    el('button', { type: 'button', class: 'info-trigger', 'aria-label': label, 'aria-expanded': 'false', 'data-info': text, text: '?' }));
}

function yearStrip(input, modelData, refs) {
  const base = baselinePath(modelData, input);
  const grid = el('div', { class: 'year-strip', role: 'group', 'aria-label': `${input.label}, year by year` });
  grid.append(el('div', { class: 'year-row-label', 'aria-hidden': 'true' }));
  for (const y of YEARS) grid.append(el('div', { class: 'year-label', text: `FY${y % 100}`, 'aria-hidden': 'true' }));
  grid.append(el('div', { class: 'year-row-label', text: 'Baseline' }));
  base.forEach((v) => grid.append(el('div', { class: 'year-baseline', text: fixed(v, 2) })));
  grid.append(el('div', { class: 'year-row-label', text: 'Input Delta' }));
  refs.inputs = YEARS.map((y, i) => {
    const input_ = el('input', {
      type: 'text', inputmode: 'decimal', class: 'year-input', value: '0.00',
      'aria-label': `${input.label}, FY${y}`, 'data-year': i,
    });
    grid.append(input_);
    return input_;
  });
  grid.append(el('div', { class: 'year-row-label', text: 'Scenario Level' }));
  refs.levels = YEARS.map(() => {
    const cell = el('div', { class: 'year-level' });
    grid.append(cell);
    return cell;
  });
  refs.baseline = base;
  return el('details', { class: 'year-strip-details' },
    el('summary', { text: 'Edit year-by-year' }),
    el('div', { class: 'year-strip-scroll' }, grid));
}

function inputCard(input, modelData, cb) {
  const refs = {};
  const shapes = input.shapes ?? SHAPES;
  const headId = `input-${input.key}-label`;
  refs.shape = el('select', { class: 'field', id: `shape-${input.key}` },
    ...shapes.map((s) => el('option', { value: s.id, text: s.label })));
  refs.magnitude = el('input', { class: 'field', id: `magnitude-${input.key}`, type: 'number', step: '0.1', value: '0', inputmode: 'decimal' });
  const card = el('div', { class: 'input-card', 'data-key': input.key, role: 'group', 'aria-labelledby': headId },
    el('h4', { id: headId, text: input.label }),
    el('p', { class: 'input-example', html: input.example }),
    el('div', { class: 'input-row' },
      el('label', { class: 'field-label', for: `shape-${input.key}` }, 'Shape', refs.shape),
      el('label', { class: 'field-label', for: `magnitude-${input.key}` }, `Magnitude (${input.units})`, refs.magnitude)),
    yearStrip(input, modelData, refs));

  const emitShape = () => cb.onShape(input.key, refs.shape.value, refs.magnitude.value);
  refs.shape.addEventListener('change', emitShape);
  refs.magnitude.addEventListener('input', emitShape);
  refs.inputs.forEach((box, i) => {
    // While editing, the field holds the full-precision value (a preset's 0.581,
    // not its 0.58 display), so an edit never silently rounds the input.
    box.addEventListener('focus', () => { box.value = editableDelta(refs.path[i]); });
    box.addEventListener('input', () => cb.onYear(input.key, i, parseDelta(box.value)));
    // Show the sign on blur so the field reads as a change from baseline.
    box.addEventListener('blur', () => { box.value = signedDelta(refs.path[i]); });
  });
  return { card, refs };
}

function advanced(summary, ...children) {
  return el('details', { class: 'details-muted' }, el('summary', { text: summary }), ...children);
}

export function createBuilder(dialog, body, modelData, cb) {
  const cards = {};
  const texts = {};

  body.append(
    el('p', { class: 'builder-intro', text: 'Change any input below to build your scenario; zero means no change from baseline. Results update as you edit, so close this drawer to see them.' }),
    el('p', { class: 'builder-note', html: '<strong>&ldquo;pp&rdquo;</strong> = percentage points (e.g., a change from 2.0% to 2.5% is +0.5 pp).' }),
  );

  const expand = el('button', { type: 'button', class: 'btn btn-quiet btn-small', text: 'Expand all' });
  const collapse = el('button', { type: 'button', class: 'btn btn-quiet btn-small', text: 'Collapse all' });
  body.append(el('div', { class: 'builder-toolbar' }, expand, collapse));

  const accordion = el('div', { class: 'accordion' });
  for (const section of SECTIONS) {
    const inner = el('div', { class: 'acc-body' }, el('p', { class: 'section-intro', html: section.intro }));
    for (const input of INPUTS.filter((i) => i.section === section.id)) {
      const { card, refs } = inputCard(input, modelData, cb);
      cards[input.key] = refs;
      inner.append(card);
      if (input.key === 'outlays') {
        texts.outlaysIndirect = el('pre', { class: 'text-panel' });
        texts.primaryBalance = el('pre', { class: 'text-panel' });
        inner.append(advanced('Advanced: calculated effects',
          el('h5', { text: 'Additional Outlay Changes from Economic Growth' }),
          el('p', { class: 'muted', text: 'The model automatically adjusts outlays when economic growth changes:' }),
          texts.outlaysIndirect,
          el('h5', { text: 'Implied Primary Budget Deficit Delta' }),
          el('p', { class: 'muted', text: 'Primary balance = Receipts - Outlays (excluding interest payments).' }),
          texts.primaryBalance));
      }
      if (input.key === 'rfstar') {
        texts.rfstarIndirect = el('pre', { class: 'text-panel' });
        inner.append(advanced('Advanced: automatic r* adjustments',
          el('p', { class: 'muted', text: 'The neutral rate adjusts automatically based on growth and debt levels.' }),
          texts.rfstarIndirect));
      }
      if (input.key === 'inflation_target') {
        texts.fast = el('input', { type: 'checkbox', id: 'fast-expectations' });
        texts.fast.addEventListener('change', () => cb.onFast(texts.fast.checked));
        inner.append(el('div', { class: 'checkbox-row' },
          el('label', { for: 'fast-expectations' }, texts.fast, ' Fast Expectations Adjustment'),
          infoButton('About Fast Expectations Adjustment', 'Check if the public immediately adjusts inflation expectations. Uncheck for gradual adjustment.')));
      }
    }
    accordion.append(el('details', { class: 'acc-section', 'data-section': section.id },
      el('summary', { text: section.title }), inner));
  }
  body.append(accordion);

  texts.summary = el('table', { class: 'data-table summary-table' });
  body.append(el('div', { class: 'builder-summary' },
    el('h3', { text: 'All Deltas Summary' }),
    el('p', { class: 'muted', text: 'All deltas in current scenario' }),
    el('div', { class: 'table-scroll' }, texts.summary)));

  const sections = () => accordion.querySelectorAll('.acc-section');
  expand.addEventListener('click', () => sections().forEach((d) => { d.open = true; }));
  collapse.addEventListener('click', () => sections().forEach((d) => { d.open = false; }));

  return {
    summaryTable: texts.summary,

    /** Redraw from app state. Fields the reader is typing in are left alone. */
    sync(state, panels) {
      const active = document.activeElement;
      for (const input of INPUTS) {
        const refs = cards[input.key];
        const path = state.deltas[input.key];
        refs.path = path;
        for (let i = 0; i < N_YEARS; i++) {
          if (refs.inputs[i] !== active) refs.inputs[i].value = signedDelta(path[i]);
          refs.levels[i].textContent = fixed(refs.baseline[i] + path[i], 2);
        }
        const { shape, magnitude } = state.shapes[input.key];
        if (refs.shape !== active) refs.shape.value = shape;
        if (refs.magnitude !== active) refs.magnitude.value = magnitude;
      }
      texts.fast.checked = state.fast;
      texts.outlaysIndirect.textContent = panels.outlaysIndirect;
      texts.primaryBalance.textContent = panels.primaryBalance;
      texts.rfstarIndirect.textContent = panels.rfstarIndirect;
    },

    open() {
      if (!dialog.open) dialog.showModal();
      // Embedded, the iframe is as tall as the page: bring its top (where the
      // drawer starts) into the reader's view.
      if (window.parentIFrame?.scrollToOffset) window.parentIFrame.scrollToOffset(0, 0);
    },
  };
}
