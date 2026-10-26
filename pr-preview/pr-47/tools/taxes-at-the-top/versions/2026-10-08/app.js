// tools/taxes-at-the-top/app.js
//
// App shell: UI state, the eight-lever controls rail, and orchestration. Two
// views: the distribution card and "how policies stack".
//
// IMPORTANT — import-safe module: this file is loaded as a browser ES
// module AND imported directly by test/render.test.mjs under Node. No
// DOM/fetch side effects may run at module top level. All bootstrap work
// (fetching data.json, building the DOM, first render) is gated behind
// boot(), which only runs when `document` exists.
import { createModel } from './model.js';
import { mountDistribution, distHeader } from './render/distribution.js';
import { mountStack, dialSummary } from './render/stack.js';

// ---- pure state helpers (exported for tests) ------------------------------
// state[key] = {on: bool, vals: {param: value}} (vals in native units: %, $)

function lawVal(p) {
  return Math.min(Math.max(p.off, p.min), p.max);
}

export function initState(LEVERS) {
  const state = {};
  LEVERS.forEach(function (l) {
    var vals = {};
    l.params.forEach(function (p) {
      // Continuous dials start at current law (zero effect), clamped into the
      // modeled range — and a POSITION axis starts at its current-law position for
      // the same reason. Switching a ladder on is like switching a rate lever on:
      // it opens the control, it does not by itself change anything. A binary param
      // is different: its off state IS the switch, so it keeps its on-position value.
      vals[p.key] = (p.fmt === 'pct' || p.fmt === 'usd') ? lawVal(p)
        : p.fmt === 'pos' ? p.off
        : p.ref;
    });
    state[l.key] = { on: false, vals: vals };
  });
  return state;
}

export function surState(state, LEVERS) {
  var s = {};
  LEVERS.forEach(function (l) {
    if (!state[l.key].on) return;
    var vals = {};
    l.params.forEach(function (p) { vals[p.key] = state[l.key].vals[p.key]; });
    s[l.key] = vals;
  });
  return s;
}

// ---- budget-window labels (pure) -------------------------------------------
// One label per DECADES entry, e.g. "2027–36" (start year in full, end year
// 2-digit). Ports the source's decLabel (app.code.js:11); exported so the
// decade toggle's button text and this file's test can share the same logic.
export function decadeLabels(DECADES) {
  return DECADES.map(function (d) { return d[0] + '–' + String(d[1]).slice(2); });
}

// ---- income-definition toggle options (pure) -------------------------------
// {def, label} per entry of model.meta.INCOME_DEFS (the same array model.js's
// etrRowAt indexes into) — so #incDefTog can't hold a def id the model itself
// doesn't recognize. Unrecognized ids still render, just titlecased.
var INCDEF_LABELS = { expanded: 'Cash income', hs: 'Accrual income' };
export function incomeDefOptions(INCOME_DEFS) {
  return INCOME_DEFS.map(function (def) {
    return { def: def, label: INCDEF_LABELS[def] || (def.charAt(0).toUpperCase() + def.slice(1)) };
  });
}

// ---- stack-view order (pure) -----------------------------------------------
// Active levers in side-panel order: rate group, then struct group — the
// default row order before any drag. Ported from app.code.js:780-786.
export function sideKeys(state, LEVERS) {
  var out = [];
  ['rate', 'struct'].forEach(function (g) {
    LEVERS.forEach(function (l) { if (l.grp === g && state[l.key].on) out.push(l.key); });
  });
  return out;
}

// Keeps a drag-reordered array in sync with which levers are active: drops
// switched-off keys, and inserts newly-switched-on keys just before the first
// existing entry that outranks them in side-panel order (so a lever flipped
// on mid-session lands where it "would have" sorted, not always at the end).
// Ported from app.code.js:787-797.
export function reconcileOrder(order, state, LEVERS) {
  var active = sideKeys(state, LEVERS);
  var next = order.filter(function (k) { return active.indexOf(k) >= 0; });
  active.forEach(function (k) {
    if (next.indexOf(k) >= 0) return;
    var si = active.indexOf(k), at = next.length;
    for (var i = 0; i < next.length; i++) { if (active.indexOf(next[i]) > si) { at = i; break; } }
    next.splice(at, 0, k);
  });
  return next;
}

function clampParam(p, x) {
  if (p.scale === 'pos' || p.fmt === 'bool' || p.fmt === 'pos') return x;
  if (isNaN(x) || x === null) return lawVal(p);
  return Math.min(Math.max(x, p.min), p.max);
}

// ---- formatting ------------------------------------------------------------
var DOLLAR = 1e6; // $ inputs shown in $M

function fmtIn(p, v) {
  return p.unit === '$' ? +(v / DOLLAR).toFixed(2) : +(+v).toFixed(2);
}
function parseIn(p, raw) {
  var x = parseFloat(raw);
  if (isNaN(x)) return lawVal(p);
  return clampParam(p, p.unit === '$' ? x * DOLLAR : x);
}
// ---- boot (browser only) ---------------------------------------------------
function $(sel, root) { return (root || document).querySelector(sel); }

var NAMES = { off: 'Step-up', carryover: 'Carryover', deemed: 'Taxed at death' };

// ---- lever infoboxes --------------------------------------------------------
// One short description per policy, behind a "?" beside its control — the pattern
// the Small Macro Model uses for its scenario presets (blsmm_helpers.R
// preset_row): a muted question mark that costs no vertical space in the rail
// until it is asked for.
//
// Unlike BLSMM's, this disclosure is a floating tooltip (see leverTipEl) rather
// than an inline panel: it reuses the charts' own hover-card treatment so the
// reader meets one card language across the page, and it is clamped and
// flip-aware because the rail is 280px and the last lever sits near the bottom
// of a short window or a short iframe.
//
// Copy is the reviewers' own, from the August 2026 round — economic substance,
// not design, so it is carried across verbatim and not reworded here. Keyed by
// lever key so the whole set is one edit.
var LEVER_INFO = {
  ord: 'Top tax rate on ordinary income such as wages and salaries, interest, '
    + 'short-term capital gains and dividends, and more.',
  cg: 'Top tax rate on long-term capital gains and dividends.',
  corp: 'Tax rate on profits of C corporations.',
  wealth: 'Annual tax rate on net worth (assets minus liabilities) above a threshold.',
  deemed: 'How unrealized capital gains are treated at death. Under current law, basis is '
    + '“stepped up” to its fair market value at death, erasing taxable gains on '
    + 'inherited assets. Under carryover basis, the heir would retain the decedent’s '
    + 'basis. Under deemed realization, death would be treated as a realization event.',
  estate: 'Tax rate on net worth at death above a threshold.',
  qbi: 'Whether to repeal the existing tax deduction equal to 20% of qualified business '
    + 'income (QBI) under Section 199A.',
  taxmax: 'Whether to remove the existing Social Security taxable maximum earnings amount '
    + 'and instead subject all earnings to tax.'
};
var INFO_PLACEHOLDER = 'Description to come.';

export function leverInfoText(key) {
  return (LEVER_INFO[key] || '').trim() || INFO_PLACEHOLDER;
}

// Pure, so the button semantics and the accessible name are assertable without a
// DOM (same reason render/stack.js exports gripHtml). The trigger sits INSIDE the
// pill, next to the policy name — which is why the pill is a div and the toggle is
// the button, not the other way round.
// Where a ladder's position goes when its TOGGLE is used.
//
// Turning ON leaves the position alone — it is already the current-law position, so
// the lever opens producing no change, exactly as a rate lever opens with its dial
// at current law. Turning OFF reverts to current law, so nothing a reader set can
// leak back in when they switch it on again.
//
// The position and the toggle are NOT the same switch. Selecting step-up leaves the
// lever on and scoring zero, which is the same thing as a wealth tax set to 0%.
export function ladderPosOnToggle(turningOn, current, offVal) {
  return turningOn ? current : offVal;
}

export function leverInfoBtn(lever) {
  return '<button type="button" class="lever-info-btn" data-info="' + escapeAttr(lever.key) + '"'
    + ' aria-expanded="false" aria-label="About ' + escapeAttr(lever.label) + '">?</button>';
}

// The explainer is one floating tooltip reused by every lever, in the same frosted
// treatment as the charts' own hover cards (#tt in styles.css) — the reader meets
// one hover-card language across the whole page, not two. It is created once and
// parked on <body>: the controls rail re-renders wholesale on every state change,
// so a tooltip living inside it would be destroyed mid-read.
var LEVER_TIP = null;
export function leverTipEl(doc) {
  var d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d) return null;
  if (LEVER_TIP && LEVER_TIP.isConnected) return LEVER_TIP;
  LEVER_TIP = d.getElementById('leverTip');
  if (!LEVER_TIP) {
    LEVER_TIP = d.createElement('div');
    LEVER_TIP.id = 'leverTip';
    LEVER_TIP.className = 'lever-tip';
    LEVER_TIP.setAttribute('role', 'tooltip');
    LEVER_TIP.hidden = true;
    d.body.appendChild(LEVER_TIP);
  }
  return LEVER_TIP;
}

// Named apart from render/stack.js's escAttr on purpose: the two escape different
// character sets, and the standalone review bundle concatenates every module into
// one scope, where a shared name means the last definition silently wins for both.
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function boot() {
  var DEC = 0;              // selected decade index — set by #decTog, see renderDecTog
  var INCDEF = 'expanded';  // selected income definition — set by #incDefTog, see renderIncDefTog
  var DIST_VIEW = 'context'; // distribution card measure: 'context' | 'new' | 'rate'
  var MARG_ORDER = [];       // stack-view row order; app-owned, drag-persisted
  var lastResults = null;    // last computeResults() output; its surrogate state (lastResults.s)
                             // is reused by onReorder to recompute stack marginals for the new
                             // order (order-dependent) without re-reading live dial state
  var ETRYEAR = '';          // dist_years[0], set once from DATA below (mirrors model.js's own ETRYEAR)
  var state, model, LEVERS;

  // Per-lever dial subtitle map ({leverKey: "top rate 44.8%", ...}) for the
  // stack view's rows (Task 20) — rebuilt from live dial state on every call
  // rather than cached, since it must reflect whatever the dials say right
  // now. Sidebar lever-selector titles (renderControls, below) intentionally
  // do NOT read this — restoring the dial subtitle here is scoped to the
  // stack rows only, per Task 20's brief.
  function dialSubtitles() {
    var out = {};
    LEVERS.forEach(function (l) { out[l.key] = dialSummary(l, state[l.key]); });
    return out;
  }

  // The stack view's own labels: the budget window it is scoring (its tooltips
  // and export image both state it) and the figure title, read from the card's
  // own heading so the exported image can't caption itself differently from the
  // page.
  function stackOpts() {
    var heading = $('#stackCard .figure-title');
    return {
      dialSubtitles: dialSubtitles(),
      gdpDecade: model.meta.GDPD[DEC],
      decadeLabel: 'FY' + decadeLabels(model.meta.DECADES)[DEC],
      title: heading ? heading.textContent.trim() : undefined
    };
  }

  // Row values are an order-DEPENDENT marginal waterfall (model.stackMarginals),
  // so a reorder must recompute, not just re-mount against a cached result.
  // Reuses the last surState (lastResults.s) rather than re-reading live dial
  // state, since the drag itself changes no dial. Called on every pointermove
  // during a drag, so evalQ's per-row cost is what bounds drag smoothness —
  // small relative to a full computeResults.
  function onReorder(newOrder) {
    MARG_ORDER = newOrder;
    var stackChart = $('#stackChart');
    if (stackChart && lastResults) mountStack(stackChart, model.stackMarginals(lastResults.s, MARG_ORDER, DEC), onReorder, stackOpts());
  }

  function onChange() {
    var s = surState(state, LEVERS);
    var r = model.computeResults(s, DEC, INCDEF);
    lastResults = r;
    var distChart = $('#distChart');
    if (distChart) mountDistribution(distChart, model.computeDistribution(s, DEC, INCDEF), DIST_VIEW, INCDEF, ETRYEAR);
    var header = distHeader(DIST_VIEW);
    var distTitleEl = $('#distTitle');
    if (distTitleEl) distTitleEl.textContent = header.title;
    var distSubEl = $('#distSubtitle');
    if (distSubEl) distSubEl.textContent = header.subtitle;
    MARG_ORDER = reconcileOrder(MARG_ORDER, state, LEVERS);
    var stackChart = $('#stackChart');
    if (stackChart) mountStack(stackChart, model.stackMarginals(s, MARG_ORDER, DEC), onReorder, stackOpts());
  }

  function renderDistViewTog() {
    Array.prototype.forEach.call(document.querySelectorAll('#distViewTog button'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.v === DIST_VIEW));
      b.onclick = function () {
        DIST_VIEW = b.dataset.v;
        renderDistViewTog();
        onChange();
      };
    });
  }

  // Budget-window (decade) toggle: buttons are built once from
  // model.meta.DECADES (the container starts empty in index.html, since the
  // decade count/years come from data, not markup).
  var DEC_NAMES = ['First decade', 'Second decade', 'Third decade'];
  function buildDecTog() {
    var host = $('#decTog');
    if (!host) return;
    host.innerHTML = '';
    decadeLabels(model.meta.DECADES).forEach(function (label, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.dec = String(i);
      b.textContent = (DEC_NAMES[i] || ('Decade ' + (i + 1))) + ' · ' + label;
      host.appendChild(b);
    });
  }
  function renderDecTog() {
    Array.prototype.forEach.call(document.querySelectorAll('#decTog button'), function (b) {
      b.setAttribute('aria-pressed', String(+b.dataset.dec === DEC));
      b.onclick = function () {
        DEC = +b.dataset.dec;
        renderDecTog();
        onChange();
      };
    });
  }

  // Built from incomeDefOptions(model.meta.INCOME_DEFS) — mirrors buildDecTog
  // building from decadeLabels(model.meta.DECADES).
  function buildIncDefTog() {
    var host = $('#incDefTog');
    if (!host) return;
    host.innerHTML = '';
    incomeDefOptions(model.meta.INCOME_DEFS).forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.def = opt.def;
      b.textContent = opt.label;
      host.appendChild(b);
    });
  }
  function renderIncDefTog() {
    Array.prototype.forEach.call(document.querySelectorAll('#incDefTog button'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.def === INCDEF));
      b.onclick = function () {
        INCDEF = b.dataset.def;
        renderIncDefTog();
        onChange();
      };
    });
  }

  // One dial row: label, number input in display units, unit suffix.
  function dialRow(l, p) {
    var row = document.createElement('div'); row.className = 'drow';
    var sp = document.createElement('span'); sp.className = 'dlab';
    sp.textContent = p.label + (p.unit === '$' ? ' ($M)' : '');
    row.appendChild(sp);
    var inp = document.createElement('input');
    inp.type = 'number'; inp.dataset.lever = l.key; inp.dataset.param = p.key;
    inp.min = fmtIn(p, p.min); inp.max = fmtIn(p, p.max);
    inp.step = p.unit === '$' ? 1 : 0.1;
    inp.value = fmtIn(p, state[l.key].vals[p.key]);
    inp.onchange = function () {
      var v = parseIn(p, inp.value);
      state[l.key].vals[p.key] = v;
      renderControls();   // re-render so the clamped/parsed value shows in the input
      onChange();
    };
    row.appendChild(inp);
    var un = document.createElement('span'); un.className = 'dunit';
    un.textContent = p.unit === '$' ? 'M' : p.unit;
    row.appendChild(un);
    return row;
  }

  // Which lever's infobox is open, if any. renderControls() rebuilds the entire
  // rail on every state change, so without this an open panel would snap shut the
  // moment the reader touched a dial while reading it.
  var INFO_OPEN = null;

  // Opens the shared tooltip under a lever's "?", or closes it when key is null.
  // The arrow is placed against the TRIGGER, not the tooltip's own left edge: the
  // tooltip is clamped to the viewport, so on a narrow screen the two diverge and a
  // fixed arrow offset points at empty space.
  function openLeverTip(key) {
    var tip = leverTipEl(document);
    if (!tip) return;
    var prev = INFO_OPEN && document.querySelector('.lever-info-btn[data-info="' + INFO_OPEN + '"]');
    if (prev) { prev.setAttribute('aria-expanded', 'false'); prev.removeAttribute('aria-describedby'); }
    INFO_OPEN = key || null;
    if (!INFO_OPEN) { tip.hidden = true; tip.classList.remove('show'); return; }

    var btn = document.querySelector('.lever-info-btn[data-info="' + INFO_OPEN + '"]');
    if (!btn) { INFO_OPEN = null; tip.hidden = true; tip.classList.remove('show'); return; }
    btn.setAttribute('aria-expanded', 'true');
    // Without this the tooltip is a role="tooltip" element nothing points at, so a
    // screen reader has no route from the button to the words. Focus stays on the
    // button, so `describedby` is what actually reads them out.
    btn.setAttribute('aria-describedby', tip.id);
    tip.textContent = leverInfoText(INFO_OPEN);
    tip.hidden = false;

    var r = btn.getBoundingClientRect();
    var GAP = 9, EDGE = 8;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.max(EDGE, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - EDGE));
    // Flip above when there is no room below — the rail is tall and the last lever
    // sits near the bottom of a short window or a short iframe.
    var below = r.bottom + GAP + h <= window.innerHeight - EDGE;
    tip.classList.toggle('above', !below);
    tip.style.left = left + 'px';
    tip.style.top = (below ? r.bottom + GAP : r.top - GAP - h) + 'px';
    tip.style.setProperty('--arrow', (r.left + r.width / 2 - left) + 'px');
    tip.classList.add('show');
  }

  // renderControls() replaces every trigger in the rail, so an open tooltip is left
  // pointing at a button that no longer exists: the tip stays on screen while its
  // replacement trigger says aria-expanded="false". Re-opening against the new node
  // puts them back in step. A mouse click usually masked this, because the document
  // click handler closed the tip first; editing a dial by keyboard does not.
  function syncLeverTip() {
    if (INFO_OPEN) { var k = INFO_OPEN; INFO_OPEN = null; openLeverTip(k); }
  }

  function renderControls() {
    ['rate', 'struct'].forEach(function (gname) {
      var host = $(gname === 'rate' ? '#rateSw' : '#structSw');
      if (!host) return;
      host.innerHTML = '';
      LEVERS.filter(function (l) { return l.grp === gname; }).forEach(function (l) {
        var wrapEl = document.createElement('div');
        wrapEl.className = 'lever' + (state[l.key].on ? ' on' : '');
        wrapEl.dataset.key = l.key;
        if (l.interp === 'ladder' || l.interp === 'ladder_x') {
          var pkey = l.params[0].key, offVal = l.params[0].off, refVal = l.params[0].ref;
          var box = document.createElement('div'); box.className = 'swseg';
          var head = document.createElement('div'); head.className = 'lever-head';
          var slab = document.createElement('span'); slab.className = 'slab';
          slab.textContent = l.label; head.appendChild(slab);
          head.insertAdjacentHTML('beforeend', leverInfoBtn(l));

          // The toggle and the three-way selector are two views of ONE state, not two
          // controls. Off means the lever contributes nothing, which for gains at
          // death is step-up — current law. Saying that with the same switch every
          // other policy has spares the reader having to know that already; the
          // selector then says WHICH departure, and stays visible either way.
          var tog = document.createElement('button');
          tog.type = 'button'; tog.className = 'dot';
          tog.setAttribute('aria-pressed', String(state[l.key].on));
          tog.setAttribute('aria-label', l.label);
          tog.onclick = function () {
            var on = !state[l.key].on;
            state[l.key].on = on;
            // Off reverts to current law and clears the choice; on takes the default.
            state[l.key].vals[pkey] = ladderPosOnToggle(on, state[l.key].vals[pkey], offVal);
            renderControls();
            onChange();
          };
          head.appendChild(tog);
          box.appendChild(head);

          var seg = document.createElement('div'); seg.className = 'seg';
          l.params[0].positions.forEach(function (pos) {
            var b = document.createElement('button'); b.type = 'button';
            b.dataset.key = l.key; b.dataset.pos = pos;
            b.textContent = NAMES[pos] || pos;
            // A closed ladder reads as its current-law position, so the selector is
            // never blank; an open one reads whatever is actually set, step-up
            // included.
            var current = state[l.key].on ? state[l.key].vals[pkey] : offVal;
            b.setAttribute('aria-pressed', String(current === pos));
            b.onclick = function () {
              // Picking a position never switches the lever OFF. Step-up is a setting
              // like any other — the lever stays on and scores zero, the way a rate
              // dial back at current law does. Only the toggle closes the control.
              state[l.key].on = true;
              state[l.key].vals[pkey] = pos;
              renderControls();
              onChange();
            };
            seg.appendChild(b);
          });
          wrapEl.appendChild(box);

          // The selector and the exclusion live in the SAME collapsible block, so the
          // toggle has one visible job: open the card, or close it and clear what was
          // set. With the selector permanently on show the toggle appeared to do
          // nothing, which is what made it read as incoherent.
          var xdials = document.createElement('div'); xdials.className = 'dials';
          xdials.dataset.xdials = l.key;
          xdials.appendChild(seg);
          if (l.interp === 'ladder_x') {
            l.params.slice(1).forEach(function (pp) { xdials.appendChild(dialRow(l, pp)); });
          }
          wrapEl.appendChild(xdials);
        } else {
          // The pill is a DIV, not a button, and the toggle inside it is the real
          // control. That is what lets the "?" sit next to the NAME: the name lives
          // inside the pill, and a <button> may not contain another button. Clicking
          // anywhere on the pill still toggles — the div carries the handler — so the
          // hit area is unchanged, and the tab order is two clean stops (? then toggle)
          // instead of one button swallowing another.
          var b2 = document.createElement('div'); b2.className = 'sw';
          b2.dataset.key = l.key;
          // Order matters: the name takes the free space, so the "?" lands in the same
          // place on every lever — beside the toggle — instead of trailing each name at
          // a different x.
          b2.innerHTML = '<span class="lbl">' + escHtml(l.label) + '</span>'
            + leverInfoBtn(l)
            + '<button type="button" class="dot" aria-pressed="' + String(state[l.key].on)
            + '" aria-label="' + escapeAttr(l.label) + '"></button>';
          b2.onclick = function (e) {
            // The "?" is inside the pill; it opens the explainer, it does not toggle.
            if (e.target && e.target.closest && e.target.closest('.lever-info-btn')) return;
            state[l.key].on = !state[l.key].on;
            renderControls();
            onChange();
          };
          wrapEl.appendChild(b2);
          if (l.kind === 'continuous') {
            var dials = document.createElement('div'); dials.className = 'dials';
            l.params.forEach(function (p) { dials.appendChild(dialRow(l, p)); });
            wrapEl.appendChild(dials);
          }
        }
        host.appendChild(wrapEl);
      });
      // One delegated handler per rail rather than one per button: renderControls
      // replaces every node in the rail. Assigned (not addEventListener) so re-running
      // this function replaces the handler instead of stacking another one.
      host.onclick = function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('.lever-info-btn') : null;
        if (!btn) return;
        e.stopPropagation();
        openLeverTip(btn.dataset.info === INFO_OPEN ? null : btn.dataset.info);
      };
    });

    syncLeverTip();

    if (!renderControls.tipWired) {
      renderControls.tipWired = true;
      // Escape closes, and so does a click anywhere else — a tooltip that outlives the
      // pointer is the usual complaint about this pattern.
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openLeverTip(null); });
      document.addEventListener('click', function (e) {
        if (!INFO_OPEN) return;
        if (e.target && e.target.closest && e.target.closest('.lever-info-btn')) return;
        openLeverTip(null);
      });
      window.addEventListener('resize', function () { if (INFO_OPEN) openLeverTip(null); });
      // Fixed positioning does not follow the document, and below the narrow
      // breakpoint the rail stops being sticky — so page scroll moves the trigger
      // out from under the tip.
      window.addEventListener('scroll', function () { if (INFO_OPEN) openLeverTip(null); }, true);
    }

    var resetBtn = $('#resetLaw');
    if (resetBtn) {
      resetBtn.onclick = function () {
        state = initState(LEVERS);   // back to boot state: off, current-law values
        renderControls();
        onChange();
      };
    }
  }

  fetch('./data/data.json')
    .then(function (res) { return res.json(); })
    .then(function (DATA) {
      model = createModel(DATA);
      LEVERS = model.meta.LEVERS;
      ETRYEAR = String(DATA.meta.dist_years[0]);   // mirrors model.js's own ETRYEAR derivation
      state = initState(LEVERS);
      renderControls();
      buildDecTog();
      renderDecTog();
      buildIncDefTog();
      renderIncDefTog();
      renderDistViewTog();
      onChange();
    })
    .catch(function (err) {
      console.error('taxes-at-the-top: failed to boot', err);
      var host = $('#tracker-sidebar');
      if (host) host.insertAdjacentHTML('afterbegin', '<div class="boot-error">Failed to load the tool’s data. Please reload the page.</div>');
    });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
