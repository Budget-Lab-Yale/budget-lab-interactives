// tools/taxes-at-the-top/test/stack-fixes.test.mjs
//
// Three defects in render/stack.js that the main render suite did not reach:
//   1. the CSV's `base` rows failed to sum to its `total` row whenever a base
//      stayed under the $0.5B DISPLAY threshold on every rung;
//   2. the PNG export labelled every axis tick but drew a line only at zero;
//   3. row reordering was pointer-only and invisible to assistive technology.
//
// This repo has NO jsdom (there is no package.json and no node_modules anywhere
// above this directory), so nothing here mounts anything. Everything asserted
// below is a pure builder's output string or array. What that leaves uncovered
// is spelled out beside the Fix 3 tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel } from '../model.js';
import { headsInOrder } from '../render/shared.js';
import {
  layoutStack, buildStackCsv, buildStackExportSvg, gripHtml, mountStack, RUNGS, LEVERS_META
} from '../render/stack.js';

const DATA = JSON.parse(readFileSync(new URL('../data/data.json', import.meta.url)));
const GDP0 = DATA.meta.gdp_fy_decades[0];
const DEC0_LABEL = 'FY2027–36';
const EX_OPTS = { decadeLabel: DEC0_LABEL, dialSubtitles: {}, title: 'Test figure title' };

// ---- Fix 1: the CSV must reconcile, threshold or no threshold --------------
//
// A synthetic marginals payload rather than a model state, because the defect
// is specifically about a base that stays UNDER $0.5B on all three rungs and
// only a hand-built segment can guarantee that condition holds. layoutStack is
// pure geometry over exactly this shape, so the synthetic input exercises the
// real path. `pkg` telescopes to the row sum, as the model's own does.
function sumSegs(segs) {
  const out = {};
  segs.forEach((s) => Object.keys(s).forEach((h) => { out[h] = (out[h] || 0) + s[h]; }));
  return out;
}
function subThresholdMarginals() {
  const rows = [
    {
      key: 'ord',
      stat: { iit: 900, pay: 0.21, other: -0.08 },
      mech: { iit: 880, pay: 0.24, other: -0.11 },
      conv: { iit: 700, pay: 0.31, other: -0.19 }
    },
    {
      key: 'corp',
      stat: { corp: 400, est: 0.14 },
      mech: { corp: 390, est: 0.17, other: -0.05 },
      conv: { corp: 310, est: 0.22, other: -0.12 }
    }
  ];
  return {
    rows,
    pkg: {
      stat: sumSegs(rows.map((r) => r.stat)),
      mech: sumSegs(rows.map((r) => r.mech)),
      conv: sumSegs(rows.map((r) => r.conv))
    }
  };
}

test('buildStackCsv: base rows reconcile to the total row even when a base never clears the $0.5B display threshold', () => {
  const marginals = subThresholdMarginals();
  // Guard the fixture itself: if a future edit pushed these over 0.5 the test
  // would pass vacuously against the old, thresholded code.
  marginals.rows.forEach((r) => {
    ['pay', 'est', 'other'].forEach((h) => {
      ['stat', 'mech', 'conv'].forEach((k) => {
        const v = (r[k] || {})[h];
        if (v !== undefined) assert.ok(Math.abs(v) < 0.5, `fixture base ${h} on ${k} is not sub-threshold`);
      });
    });
  });

  const layout = layoutStack(marginals, GDP0);
  const csv = buildStackCsv(layout, GDP0, DEC0_LABEL, {});
  const header = csv[0], body = csv.slice(1);
  const col = (n) => header.indexOf(n);

  const key = (r) => r[col('policy')] + '|' + r[col('stage')];
  const totals = {}, sums = {}, counts = {};
  body.forEach((r) => {
    const v = Number(r[col('revenue_usd_billions')]);
    if (r[col('scope')] === 'total') totals[key(r)] = v;
    else { sums[key(r)] = (sums[key(r)] || 0) + v; counts[key(r)] = (counts[key(r)] || 0) + 1; }
  });

  const groups = Object.keys(totals);
  assert.equal(groups.length, (marginals.rows.length + 1) * RUNGS.length,
    'one total line per policy per stage, plus the whole package');
  groups.forEach((k) => {
    // An identity, not a hardcoded number: the base lines ARE the decomposition
    // of the total line, so the only slack allowed is the CSV's own toFixed(3).
    const slack = 0.0005 * (counts[k] + 1);
    assert.ok(Math.abs(totals[k] - (sums[k] || 0)) <= slack,
      `${k}: bases ${sums[k]} != total ${totals[k]}`);
  });

  // The sub-threshold bases must actually be in the file — a reconciliation
  // that held because every base was dropped would be no fix at all.
  const bases = new Set(body.filter((r) => r[col('scope')] === 'base').map((r) => r[col('tax_base')]));
  assert.ok(bases.has('Payroll'), 'the sub-threshold payroll base is missing from the CSV');
  assert.ok(bases.has('Other'), 'the sub-threshold other base is missing from the CSV');
});

test('buildStackCsv: base lines follow the fixed display order, not row or object-key order', () => {
  const layout = layoutStack(subThresholdMarginals(), GDP0);
  const csv = buildStackCsv(layout, GDP0, DEC0_LABEL, {});
  const header = csv[0], col = (n) => header.indexOf(n);
  const LABEL_TO_HEAD = {
    'Individual income': 'iit', 'Capital gains': 'cg', 'Payroll': 'pay', 'Corporate': 'corp',
    'Estate / deemed at death': 'est', 'Wealth': 'wealth', 'Other': 'other'
  };
  const groups = {};
  csv.slice(1).forEach((r) => {
    if (r[col('scope')] !== 'base') return;
    const k = r[col('policy')] + '|' + r[col('stage')];
    (groups[k] = groups[k] || []).push(LABEL_TO_HEAD[r[col('tax_base')]]);
  });
  assert.ok(Object.keys(groups).length > 0, 'no base lines found at all');
  Object.keys(groups).forEach((k) => {
    assert.deepEqual(groups[k], headsInOrder(groups[k]), `${k}: base lines are out of display order`);
  });
});

// ---- Fix 2: the export must draw the gridlines it labels -------------------

function realLayout() {
  const model = createModel(DATA);
  const state = { ord: { rate: 45 }, corp: { rate: 35 }, wealth: { rate: 2, thr: 50000000 } };
  return layoutStack(model.stackMarginals(state, ['ord', 'corp', 'wealth'], 0), GDP0);
}

// Vertical rules only (x1 === x2): the export also draws one HORIZONTAL rule,
// the separator above the whole-package row.
function verticalLines(svg) {
  return [...svg.matchAll(/<line x1="([-\d.]+)" x2="([-\d.]+)" y1="([-\d.]+)" y2="([-\d.]+)" stroke="([^"]+)"([^>]*)\/>/g)]
    .map((m) => ({ x1: m[1], x2: m[2], y1: m[3], y2: m[4], stroke: m[5], rest: m[6] }))
    .filter((l) => l.x1 === l.x2);
}

test('buildStackExportSvg: one gridline per tick per row, not just the zero line', () => {
  const layout = realLayout();
  assert.ok(layout.ticks.length >= 3, 'fixture should span several ticks');
  const svg = buildStackExportSvg(layout, GDP0, EX_OPTS);

  const rowCount = layout.rows.length + 1;              // + the whole-package row
  const lines = verticalLines(svg);
  assert.equal(lines.length, layout.ticks.length * rowCount,
    'expected ticks x rows vertical gridlines in the export');

  // Grouped by the row band they belong to: every band carries the full set.
  const byBand = {};
  lines.forEach((l) => { (byBand[l.y1] = byBand[l.y1] || []).push(l); });
  assert.equal(Object.keys(byBand).length, rowCount, 'one gridline band per row');
  Object.keys(byBand).forEach((y) => {
    assert.equal(byBand[y].length, layout.ticks.length, `row band at y=${y} is missing gridlines`);
    assert.equal(new Set(byBand[y].map((l) => l.x1)).size, layout.ticks.length,
      `row band at y=${y} draws two lines at the same x`);
  });
});

test('buildStackExportSvg: gridlines match the screen treatment — solid 1px, zero on the axis token, the rest on the gridline token', () => {
  const layout = realLayout();
  const svg = buildStackExportSvg(layout, GDP0, EX_OPTS);
  const lines = verticalLines(svg);
  const rowCount = layout.rows.length + 1;

  lines.forEach((l) => assert.match(l.rest, /stroke-width="1"/, 'gridlines are 1px'));
  lines.forEach((l) => assert.ok(!/stroke-dasharray/.test(l.rest), 'gridlines are solid, never dashed'));

  // Outside a browser cssVar takes its fallback, so these are the vendored
  // engine tokens' own literal values.
  const zero = lines.filter((l) => l.stroke === '#999999');
  const grid = lines.filter((l) => l.stroke === '#F0F0F0');
  assert.equal(zero.length, rowCount, 'exactly one axis-stroke (zero) line per row');
  assert.equal(grid.length, (layout.ticks.length - 1) * rowCount, 'every other tick draws a gridline');
  assert.equal(zero.length + grid.length, lines.length, 'a gridline resolved to an unexpected colour');
});

test('buildStackExportSvg: gridlines sit behind the bars, and nothing in the export is an unresolved custom property', () => {
  const layout = realLayout();
  const svg = buildStackExportSvg(layout, GDP0, EX_OPTS);
  // A rasterized SVG has no stylesheet to resolve var() against.
  assert.equal(svg.indexOf('var(--'), -1, 'the export leaks an unresolved CSS custom property');
  // SVG paints in document order, so the first gridline must precede the first
  // bar rect. Bar rects are matched by their fractional width (toFixed(1)) —
  // the page-background rect and the legend swatches both use whole numbers.
  const firstGrid = svg.indexOf('stroke-width="1"/>');
  const firstBar = svg.search(/<rect x="[-\d.]+" y="\d+" width="[\d.]+\.\d" height="\d+" fill="#/);
  assert.ok(firstGrid > -1, 'no gridline markup found');
  assert.ok(firstBar > -1, 'no bar rect found — the regex no longer matches the markup');
  assert.ok(firstGrid < firstBar, 'a bar is painted before the gridlines — the grid would cover it');
});

// ---- Fix 3: reordering is a keyboard-operable, announced control -----------
//
// NOT COVERED HERE (no jsdom in this repo, so there is no element to dispatch
// an event at):
//   * that ArrowUp/ArrowDown actually reorder and call onReorder;
//   * that focus lands back on the same row's grip after the re-render;
//   * that the live region is created, announced into, and visually clipped;
//   * that preventDefault stops the page scrolling;
//   * that the pointer drag still works.
// Those are browser checks. What IS assertable is the markup the grip is built
// from, which is where the semantics live.

test('gripHtml: an active row gets a real button with an accessible name that says WHICH policy it moves', () => {
  const html = gripHtml(false, LEVERS_META.ord.label);
  assert.match(html, /^<button /, 'the grip must be a button, not a span');
  assert.match(html, /type="button"/, 'an untyped button submits any enclosing form');
  assert.match(html, /class="mgrip"/, 'the mgrip class carries the styling, including :focus-visible');
  assert.match(html, /aria-label="Reorder Top ordinary rate"/,
    'the accessible name must name the policy, not just say "Reorder"');
  assert.ok(!/aria-hidden/.test(html), 'the control must not be hidden from assistive technology');
  assert.ok(!/tabindex="-1"/.test(html), 'the grip must stay in the tab order');
});

test('gripHtml: the accessible name is escaped, so a label with markup characters cannot break out of the attribute', () => {
  const html = gripHtml(false, 'Rate & "cap" <x>');
  assert.match(html, /aria-label="Reorder Rate &amp; &quot;cap&quot; &lt;x&gt;"/);
});

test('gripHtml: the Total row keeps an inert ghost — not a disabled button, not focusable', () => {
  const html = gripHtml(true, 'Whole package');
  assert.ok(!/<button/.test(html), 'the ghost must not be a button — a disabled button still reads to AT');
  assert.match(html, /class="mgrip ghost"/, 'the ghost keeps its layout class');
  assert.match(html, /aria-hidden="true"/, 'the ghost is decorative spacing');
  assert.ok(!/tabindex/.test(html), 'the ghost must never enter the tab order');
});

test('gripHtml: the affordance is discoverable by both input modes', () => {
  const html = gripHtml(false, 'Corporate rate');
  assert.match(html, /title="[^"]*[Dd]rag[^"]*"/, 'the drag affordance is still advertised');
  assert.match(html, /title="[^"]*arrow[^"]*"/i, 'the keyboard affordance must be advertised too');
});

// An empty package must still draw its whole-package row. mountStack used to bail
// with `el.innerHTML = ''` when no policy was switched on, so the page opened on a
// blank space where a chart would later appear. Everything below the mount already
// handled the empty case — layoutStack returns scale 1 with a single zero tick, and
// the export and CSV paths run clean on it — so the early return was the only thing
// stopping it. Driven through mountStack with a minimal fake element: the module's
// document-touching helpers all guard on `typeof document === 'undefined'`, so this
// runs in bare node.
test('mountStack draws the package row with no policies selected', () => {
  const model = createModel(DATA);
  const marginals = model.stackMarginals({}, [], 0);
  assert.equal(marginals.rows.length, 0, 'fixture must actually be an empty package');

  let html = '';
  const el = {
    clientWidth: 660,
    set innerHTML(v) { html = v; },
    get innerHTML() { return html; },
    addEventListener() {},
    querySelector() { return null; }
  };
  mountStack(el, marginals, () => {}, { gdpDecade: model.meta.GDPD[0], decadeLabel: 'FY2027-36' });

  assert.ok(html.length > 0, 'an empty package still renders');
  assert.ok(html.includes('mrow total'), 'the whole-package row is drawn');
  assert.ok(html.includes('Whole package'));
  assert.ok(html.includes('Switch on a policy to start'), '0 policies must not read "0 policies together"');
  assert.ok(html.includes('mstack-footer'), 'the download controls stay available');
  // Nothing to key: the legend row is omitted rather than drawn empty.
  assert.ok(!html.includes('mstack-head'), 'an empty package draws no legend');
  assert.ok(!/NaN/.test(html), html.slice(0, 200));
});

// The bar and axis SVGs use preserveAspectRatio="none", so any gap between the
// viewBox width and the width the bar column actually renders at is a horizontal
// stretch — of the tick labels (visibly), the 1px segment gaps and the gridlines.
// The viewBox width used to be an estimate from the container width minus the
// fixed column bases, which is wrong once the narrow-container rules change the
// columns: embedded in a 900px article it drew at 140 and rendered at 182 (1.3x).
// And nothing redrew on resize. So the mount measures the bar column it has just
// laid out and redraws at that width, and redraws again when the container width
// changes.
function stackHost(barWidth, containerWidth) {
  let html = '';
  return {
    clientWidth: containerWidth,
    barWidth,
    set innerHTML(v) { html = v; },
    get innerHTML() { return html; },
    addEventListener() {},
    querySelector(sel) {
      return sel === '.mrow.axis .mbar' && html.includes('mrow axis') ? { clientWidth: this.barWidth } : null;
    }
  };
}
const axisViewBoxW = (html) => Number(/<svg viewBox="0 0 ([\d.]+) 16"[^>]*class="maxis"/.exec(html)[1]);
const barViewBoxWs = (html) => [...html.matchAll(/<svg viewBox="0 0 ([\d.]+) [\d.]+"[^>]*class="mbarsvg"/g)].map((m) => Number(m[1]));

test('mountStack draws the bars at the width the bar column actually renders at', () => {
  const model = createModel(DATA);
  const marginals = model.stackMarginals({ ord: { rate: 44.8 } }, ['ord'], 0);
  const el = stackHost(182, 499);
  mountStack(el, marginals, () => {}, { gdpDecade: model.meta.GDPD[0], decadeLabel: 'FY2027-36' });
  assert.equal(axisViewBoxW(el.innerHTML), 182);
  const bars = barViewBoxWs(el.innerHTML);
  assert.ok(bars.length > 0);
  assert.ok(bars.every((w) => w === 182), String(bars));
});

test('mountStack redraws when its container changes width', () => {
  const model = createModel(DATA);
  const marginals = model.stackMarginals({ ord: { rate: 44.8 } }, ['ord'], 0);
  const observers = [];
  globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} };
  try {
    const el = stackHost(274, 798);
    mountStack(el, marginals, () => {}, { gdpDecade: model.meta.GDPD[0], decadeLabel: 'FY2027-36' });
    mountStack(el, marginals, () => {}, { gdpDecade: model.meta.GDPD[0], decadeLabel: 'FY2027-36' });
    assert.equal(observers.length, 1, 'one observer per container, however often it is re-mounted');
    assert.equal(axisViewBoxW(el.innerHTML), 274);
    el.clientWidth = 583; el.barWidth = 225;
    observers[0].cb([]);
    assert.equal(axisViewBoxW(el.innerHTML), 225);
  } finally {
    delete globalThis.ResizeObserver;
  }
});

// The narrow-width rule that hides .mtag and the rule that reveals .mstack-note
// are a PAIR. They came apart once: the column was dropped on the justification
// that the card's caption named the three rungs, then the caption was deleted in
// a later pass and the rule stayed, leaving a narrow reader three bars per row
// with nothing naming any of them (the legend keys tax BASES, not rungs). Nothing
// else in the suite can catch that — no browser, and the two rules live in a
// different file from the caption that used to justify them.
test('hiding the rung column always reveals the rung key', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('@container stack-card (max-width: 700px)'));
  const scoped = block.slice(0, block.indexOf('\n}'));
  assert.match(scoped, /\.mtag\s*\{[^}]*display:\s*none/,
    'fixture assumes this block is where .mtag is dropped');
  assert.match(scoped, /\.mstack-note\s*\{[^}]*display:\s*block/,
    '.mtag is hidden without revealing .mstack-note: the rungs go unnamed');
  // And the key names all three, built from RUNGS rather than retyped.
  const src = readFileSync(new URL('../render/stack.js', import.meta.url), 'utf8');
  assert.match(src, /function rungKeyHtml\(\)[\s\S]{0,200}RUNGS\.map/,
    'the key must be derived from RUNGS, not a hand-copied list that can drift');
});
