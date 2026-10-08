// tools/taxes-at-the-top/render/stack.js
//
// "How policies stack": one row per active lever, drag-to-reorder, each row
// showing the same revenue on three rungs — the first-order tax change, plus
// mechanical tax-base interactions, plus behavioral response (the revenue
// actually collected). Hand-built SVG; not engine-expressible, see
// docs/engine-requests/stack-static-vs-behavioral-overlay.md.
//
// Rows come from model.stackMarginals(s, order, dec): an order-DEPENDENT prefix
// waterfall over the by-head 'sh'/'mh'/'ch' surrogate quantities, so each row
// spreads across several tax-base-colored sub-segments (including negative,
// left-of-zero drains) and dragging actually recomputes which row absorbs a
// given interaction. Order-independent Shapley attribution was tried and
// rejected: it flattened the per-base drains and made dragging cosmetic.
//
// The collected rung is drawn at double thickness and full strength: it is the
// score the reader came for, and it carries the row's largest number. The two
// rungs above it are the workings, held back by both a lighter step of the base's
// own hue and reduced opacity, so the eye lands on the score first. Within a row
// a base keeps one hue across all three rungs.
import {
  usd, pgs, roundedPg, dirAtPrecision, headColor, headHue, hueVar, hueHex, cssVar,
  headsInOrder, tipAttr, wireTooltipDelegation, setTipSuppressed
} from './shared.js';
import { whyCopy } from './stack-copy.js';
import { downloadPNG, downloadCSV } from './export.js';
import { LOGO_DATA_URI, LOGO_ASPECT } from './logo.js';

// Static per-lever label, mirroring DATA.meta.levers the same way
// distribution.js hardcodes its HEADS table — stackMarginals' rows carry no
// lever labels, only a key and a per-base dollar split. Keep in sync with
// data/data.json meta.levers if levers change.
export var LEVERS_META = {
  ord: { label: 'Top ordinary rate' },
  cg: { label: 'Capital gains & dividends top rate' },
  corp: { label: 'Corporate rate' },
  wealth: { label: 'Annual wealth tax' },
  deemed: { label: 'Gains at death' },
  estate: { label: 'Estate tax' },
  qbi: { label: 'Repeal QBI (§199A)' },
  taxmax: { label: 'Eliminate SS taxable max' }
};

function metaFor(key) { return LEVERS_META[key] || { label: key }; }

// The three rungs, top to bottom within a row. `step` is the position on each
// base hue's light-to-dark ladder (see shared.js's HUE_VAR); y/h are in ROW_H
// units. One table drives the bars, their tags, their numbers and the export
// image, so those four cannot drift apart.
export var RUNGS = [
  { k: 'stat', tag: 'first-order tax change', label: 'First-order tax change', step: 1, y: 2, h: 14, opacity: 0.55 },
  { k: 'mech', tag: '+ mechanical effects', label: '+ mechanical effects', step: 2, y: 20, h: 14, opacity: 0.75 },
  { k: 'conv', tag: '+ behavioral effects', label: '+ behavioral effects', step: 3, y: 38, h: 28, opacity: 1 }
];
var ROW_H = 68;
var RUNG_KEYS = RUNGS.map(function (u) { return u.k; });
// The rung the chart is ultimately about: the collected score.
export var SCORE_RUNG = RUNGS[RUNGS.length - 1];

// Per-lever dial subtitle, e.g. "top rate 44.8%" or "rate 2% · $50M". A usd
// param at zero is current law and prints nothing — which is what keeps the
// `deemed` exclusion dial silent until it is actually set; when it is set it is
// labelled "excl" so it cannot be read as a threshold. `lever` is a
// meta.BYKEY[key] entry, `leverState` the matching live state[key] ({on, vals}).
export function dialSummary(lever, leverState) {
  if (!lever || !leverState || !leverState.on) return '';
  return lever.params.map(function (p) {
    var v = leverState.vals[p.key];
    if (p.fmt === 'pct') return p.label.toLowerCase() + ' ' + (+v).toFixed(1).replace(/\.0$/, '') + '%';
    if (p.fmt === 'usd') {
      if (!v) return '';
      var ds = '$' + (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
      return lever.key === 'deemed' ? ds + ' excl' : ds;
    }
    if (p.fmt === 'pos') return v;
    return '';
  }).filter(Boolean).join(' · ');
}

// Tax-base display label — shared by the on-screen legend, the tooltip
// breakdown, the export image and the CSV, so none of them can drift.
var HEAD_LABEL = { iit: 'Individual income', cg: 'Capital gains', pay: 'Payroll', corp: 'Corporate', est: 'Estate / deemed at death', wealth: 'Wealth', other: 'Other' };
function headLabel(h) { return HEAD_LABEL[h] || h; }

// The tooltip title says "<base> base", which reads badly for the one compound
// label — "Estate / deemed at death base" — so the title takes a short form
// there. Every other base uses HEAD_LABEL, keeping the card, the legend, the
// export image and the CSV on one vocabulary.
var BASE_TITLE = { est: 'Estate' };
function baseTitle(h) { return (BASE_TITLE[h] || headLabel(h)) + ' base'; }

// Bases that actually appear (>= $0.5B on any rung) across a set of rows, in the
// fixed display order — the vocabulary shared by the bars, the legend, the
// tooltip and the exports. Order comes from shared.js's headsInOrder, never from
// row order, so dragging policies around cannot reshuffle the bases.
function usedHeads(rows) {
  var seen = {};
  rows.forEach(function (r) {
    RUNG_KEYS.forEach(function (k) {
      var seg = r[k] || {};
      Object.keys(seg).forEach(function (h) { if (Math.abs(seg[h] || 0) >= 0.5) seen[h] = true; });
    });
  });
  return headsInOrder(Object.keys(seen));
}

// Every base key present anywhere in ONE row's rung segments, in the same fixed
// display order — no magnitude threshold. Deliberately not usedHeads: that
// applies a $0.5B DISPLAY threshold, which is right for the bars, the legend and
// the on-screen readout but wrong for a data file. The CSV emits each row's
// `total` line from the UNFILTERED segment, so a base that stayed under $0.5B on
// every rung was dropped from the `base` lines while its dollars remained in the
// total — and the decomposition silently stopped adding up. Reconciliation is
// the whole point of the two scopes, so the threshold cannot apply here.
function csvHeads(row) {
  var seen = {};
  RUNG_KEYS.forEach(function (k) {
    Object.keys(row[k] || {}).forEach(function (h) { seen[h] = true; });
  });
  return headsInOrder(Object.keys(seen));
}

function segPos(seg) { var t = 0; Object.keys(seg).forEach(function (h) { if (seg[h] > 0) t += seg[h]; }); return t; }
function segNeg(seg) { var t = 0; Object.keys(seg).forEach(function (h) { if (seg[h] < 0) t -= seg[h]; }); return t; }
function segNet(seg) { var t = 0; Object.keys(seg).forEach(function (h) { t += seg[h]; }); return t; }

function niceStep(x) {
  if (!(x > 0)) return 1;
  var p = Math.pow(10, Math.floor(Math.log(x) / Math.LN10));
  var n = x / p, m = n < 1.5 ? 1 : (n < 3 ? 2 : (n < 7 ? 5 : 10));
  return m * p;
}

// Pure geometry: converts model.stackMarginals(s, order, dec)'s output into
// per-row rung segments plus the shared x-domain (posMax+negMax and nice tick
// values) that mountStack scales to pixel width. No DOM. The total ("Whole
// package") row is `marginals.pkg` directly — the telescoped final prefix, which
// sums exactly to it for ANY row order by construction.
//
// `gdpDecade` is required: ticks are chosen at round shares of GDP, since that
// is the unit the axis prints. Choosing them on the dollar span instead — as the
// reference prototype does — yields round dollars that label as 1.01% / 1.51%.
export function layoutStack(marginals, gdpDecade) {
  var rows = marginals.rows.map(function (r) {
    return {
      key: r.key, stat: r.stat, mech: r.mech, conv: r.conv,
      net: segNet(r.conv) - segNet(r.stat)
    };
  });
  var pkg = marginals.pkg;
  var total = {
    stat: segNet(pkg.stat), mech: segNet(pkg.mech), conv: segNet(pkg.conv),
    net: segNet(pkg.conv) - segNet(pkg.stat),
    statSeg: pkg.stat, mechSeg: pkg.mech, convSeg: pkg.conv
  };

  var posMax = 0, negMax = 0;
  rows.concat([{ stat: total.statSeg, mech: total.mechSeg, conv: total.convSeg }]).forEach(function (r) {
    RUNG_KEYS.forEach(function (k) {
      posMax = Math.max(posMax, segPos(r[k] || {}));
      negMax = Math.max(negMax, segNeg(r[k] || {}));
    });
  });
  var span = (posMax + negMax) || 1;
  // Stepped as an integer multiple of stepPct rather than by repeated addition,
  // so a tick lands exactly on the round share it is labelled with.
  var toPct = function (v) { return v / gdpDecade * 100; };
  var stepPct = niceStep(toPct(span) / 4), ticks = [];
  var first = Math.ceil(toPct(-negMax) / stepPct), last = Math.floor(toPct(posMax) / stepPct);
  for (var i = first; i <= last; i++) ticks.push(i * stepPct / 100 * gdpDecade);

  return { rows: rows, scale: span, posMax: posMax, negMax: negMax, ticks: ticks, total: total };
}

// Per-rung net level plus the step down from the rung above, both rounded to the
// two decimals the row prints — so the arrow always equals the difference of the
// two printed levels. Shared by the on-screen rows, the tooltip and the exports.
export function rungLevels(row, gdpDecade) {
  var prev = null;
  return RUNGS.map(function (u) {
    var value = segNet(row[u.k] || {});
    var rounded = roundedPg(value, gdpDecade);
    var step = prev === null ? null : rounded - prev;
    prev = rounded;
    return { rung: u, value: value, step: step };
  });
}

// ---- SVG emission -----------------------------------------------------------

function gridSvg(ticks, xz, sc, h) {
  return ticks.map(function (t) {
    var x = xz + t * sc, zero = Math.abs(t) < 1e-6;
    // Solid 1px on the engine's own tokens. The engine reserves dashes for
    // reference-line markers, so a dashed gridline reads here as an annotation.
    return '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="0" y2="' + h
      + '" stroke="' + (zero ? 'var(--tbl-axis-stroke)' : 'var(--tbl-gridline)') + '" stroke-width="1"/>';
  }).join('');
}

// One hover card per SEGMENT: the policy and tax type in the head, the settings
// and budget window on the small line under it, the hovered figure as the hero
// with its dollar equivalent, THIS BASE on all three stages (not the row totals,
// which are already printed beside the bar), and the mechanism sentence. Content
// follows the reference prototype's own readout.
export function segTipCfg(head, value, rung, row, gdpDecade, decadeLabel) {
  // Direction from the share as PRINTED: a slice that rounds to 0.00% gets no
  // caret rather than a red ▾ over a zero.
  var dir = dirAtPrecision(value / gdpDecade * 100, 2);
  var policy = row.isTotal ? 'Whole package' : metaFor(row.key).label;
  var dials = row.isTotal ? '' : (row.subtitle || '');
  return {
    head: policy + ' · ' + baseTitle(head),
    meta: [dials, decadeLabel].filter(Boolean).join(' · '),
    glyph: dir === 0 ? '' : (dir < 0 ? '▾' : '▴'),
    glyphColor: dir < 0 ? 'var(--tbl-red-400)' : 'var(--tbl-green-400)',
    amount: pgs(value, gdpDecade),
    sub: usd(value) + ' over the decade',
    rows: RUNGS.map(function (u) {
      var v = (row[u.k] || {})[head] || 0;
      return {
        color: headColor(head, u.step),
        label: u.label,
        alt: usd(v),
        value: pgs(v, gdpDecade),
        current: u.k === rung.k
      };
    }),
    note: whyCopy(row, head, rung.k, gdpDecade)
  };
}

// A diverging stack: positive segments accumulate rightward from the zero line,
// negative segments leftward, independently, so a drained base reads correctly
// alongside bases that gain. Segments are emitted in the fixed base order, so a
// base holds its position in every bar. Fill goes through `style=` rather than
// the bare `fill=` presentation attribute — headColor returns a var(--tbl-*)
// reference, and a style attribute is guaranteed to resolve custom properties.
// Corners stay SQUARE — no rx, here or in exportBarSvg. The engine's bar marks
// pass no rx, so a rounded rect here reads as a second chart language beside the
// distribution card. Separation comes from the 1px gap (w - 1), not a radius.
function barSvg(seg, rung, xz, sc, heads, row, gdpDecade, decadeLabel) {
  var xp = xz, xn = xz, out = '';
  var rect = function (h, v, x, drained) {
    var w = Math.abs(v) * sc;
    // A drained segment sits back a further notch from its own rung's strength.
    var op = rung.opacity * (drained ? 0.8 : 1);
    return '<rect x="' + x.toFixed(1) + '" y="' + rung.y + '" width="' + Math.max(0.5, w - 1).toFixed(1)
      + '" height="' + rung.h + '" style="fill:' + headColor(h, rung.step)
      + (op < 1 ? ';opacity:' + op.toFixed(2) : '') + '" '
      + tipAttr(segTipCfg(h, v, rung, row, gdpDecade, decadeLabel)) + '/>';
  };
  heads.forEach(function (h) {
    var v = seg[h] || 0;
    if (v <= 0) return;
    out += rect(h, v, xp, false);
    xp += v * sc;
  });
  heads.forEach(function (h) {
    var v = seg[h] || 0;
    if (v >= 0) return;
    xn -= -v * sc;
    out += rect(h, v, xn, true);
  });
  return out;
}

function rowBarSvg(row, bw, xz, sc, ticks, heads, gdpDecade, decadeLabel) {
  return '<svg viewBox="0 0 ' + bw.toFixed(1) + ' ' + ROW_H + '" preserveAspectRatio="none" class="mbarsvg">'
    + gridSvg(ticks, xz, sc, ROW_H)
    + RUNGS.map(function (u) { return barSvg(row[u.k] || {}, u, xz, sc, heads, row, gdpDecade, decadeLabel); }).join('')
    + '</svg>';
}

// A rung's vertical center as a percentage of row height, so tags and numbers
// line up with their own bar.
function rungCenter(u) { return ((u.y + u.h / 2) / ROW_H * 100).toFixed(1) + '%'; }

// A step that rounds to zero gets no arrow and no color: a green ▴0.00% claims a
// gain the number itself denies.
export function stepText(step) {
  if (step === null) return { text: '', dir: 0 };
  var shown = Math.abs(step).toFixed(2);
  var dir = parseFloat(shown) === 0 ? 0 : (step < 0 ? -1 : 1);
  return { text: (dir === 0 ? '' : (dir < 0 ? '▾' : '▴')) + shown + '%', dir: dir };
}

function stepSpan(step) {
  var s = stepText(step);
  if (!s.text) return '<span class="md"></span>';
  var color = s.dir === 0 ? 'var(--tbl-text-muted)' : 'var(' + (s.dir < 0 ? '--tbl-red-400' : '--tbl-green-400') + ')';
  return '<span class="md" style="color:' + color + '">' + s.text + '</span>';
}

// The reorder handle. Reordering is a substantive control, not a view tweak — it
// RECOMPUTES the attribution (the per-row split is order-dependent, see the file
// header), so a pointer-only span with aria-hidden on it, which is what this was,
// put a real result out of reach of anyone not using a mouse. It is now a real
// button: focusable, named after the policy it moves ("Reorder" alone would give
// every row the same name in a list of buttons), and driven by arrow keys in
// wireStackDrag. The `mgrip` class is kept so styles.css still owns the look,
// including its :focus-visible ring; only the properties a UA button imposes and
// that class does NOT set (its chrome, and font-family) are reset inline.
//
// Exported as a headless test seam: this repo has no jsdom, so asserting on this
// string is the only way to pin the control's semantics.
//
// The Total row's ghost keeps the grip column's width and stays a SPAN. A
// disabled button would still be announced, and the whole package cannot move.
// The UA button chrome reset lives in styles.css's own `.mgrip` rule (appearance,
// background, border, margin, padding, and font-family — a <button> does NOT
// inherit the face, so without it the braille glyph drops to the UA font while
// the 14px size still applies). It was briefly inline here; do not put it back.
export function gripHtml(isTotal, label) {
  if (isTotal) return '<span class="mgrip ghost" aria-hidden="true"></span>';
  return '<button type="button" class="mgrip"'
    + ' title="Drag, or press the up and down arrow keys, to reorder"'
    + ' aria-label="Reorder ' + escAttr(label) + '">⠿</button>';
}

function rowHtml(row, bw, xz, sc, ticks, heads, gdpDecade, decadeLabel, activeCount) {
  var isTotal = !!row.isTotal;
  var levels = rungLevels(row, gdpDecade);

  var tags = RUNGS.map(function (u) {
    return '<span class="t' + u.k + '" style="top:' + rungCenter(u) + '">' + u.tag + '</span>';
  }).join('');
  // Dollars and shares are absolutely positioned at their own rung's center. The
  // share column is a two-lane grid (step | level) so the steps align in a
  // column of their own — the rungs' levels are set at different sizes, so an
  // inline step would sit at a different x on every line.
  var dollars = levels.map(function (l) {
    return '<div class="d-' + l.rung.k + '" style="top:' + rungCenter(l.rung) + '">' + usd(l.value) + '</div>';
  }).join('');
  var shares = levels.map(function (l) {
    return '<div class="mn is-' + l.rung.k + '" style="top:' + rungCenter(l.rung) + '">'
      + stepSpan(l.step) + '<span class="lv">' + pgs(l.value, gdpDecade) + '</span></div>';
  }).join('');

  var label = isTotal ? 'Whole package' : metaFor(row.key).label;
  // "0 policies together" is not a sentence anyone writes; the empty package says
  // what to do instead.
  var subl = isTotal
    ? (activeCount === 0 ? 'Switch on a policy to start' : activeCount + ' polic' + (activeCount === 1 ? 'y' : 'ies') + ' together')
    : (row.subtitle || '');

  return '<div class="mrow' + (isTotal ? ' total' : '') + '"' + (isTotal ? '' : ' data-key="' + row.key + '"') + '>'
    + gripHtml(isTotal, label)
    + '<div class="mlab"><div class="mname">' + label + '</div>' + (subl ? '<div class="msub">' + subl + '</div>' : '') + '</div>'
    + '<div class="mtag">' + tags + '</div>'
    + '<div class="mbar">' + rowBarSvg(row, bw, xz, sc, ticks, heads, gdpDecade, decadeLabel) + '</div>'
    + '<div class="mdol">' + dollars + '</div>'
    + '<div class="mnum">' + shares + '</div></div>';
}

function axisHtml(ticks, bw, xz, sc, gdpDecade) {
  return '<div class="mrow axis">' + gripHtml(true, '') + '<div class="mlab"></div>'
    + '<div class="mtag"></div>'
    + '<div class="mbar"><svg viewBox="0 0 ' + bw.toFixed(1) + ' 16" preserveAspectRatio="none" class="maxis">'
    + ticks.map(function (t) {
      var x = xz + t * sc;
      return '<text x="' + x.toFixed(1) + '" y="11" text-anchor="middle" font-size="9" fill="var(--tbl-text-muted)" font-family="var(--tbl-font-sans)">'
        + (Math.abs(t) < 1e-6 ? '0' : pgs(t, gdpDecade)) + '</text>';
    }).join('')
    + '</svg></div><div class="mdol"></div><div class="mnum"></div></div>';
}

// Swatches at the score rung's full-strength step; the ladder itself is
// explained in the reading key below rather than tripling every swatch.
function legendHtml(heads) {
  return heads.map(function (h) {
    return '<span class="it"><span class="sw2" style="background:' + headColor(h, SCORE_RUNG.step) + '"></span>' + headLabel(h) + '</span>';
  }).join('');
}

// The three rung names, for the narrow-container case where .mtag is dropped and
// nothing else on screen names them. Built from RUNGS so it cannot drift from the
// column it stands in for. Hidden by default — see styles.css.
function rungKeyHtml() {
  return '<div class="mstack-note">Bars per row, palest to thickest: '
    + RUNGS.map(function (u) { return u.tag; }).join(' &middot; ')
    + '</div>';
}

function widthOf(el) { return Math.max(300, el.clientWidth || 660); }

// ---- data export ------------------------------------------------------------
// Tidy long CSV of the package score. `scope` separates the two things a reader
// wants from one file: `total` rows are the score of each policy (and of the
// whole package) on each rung; `base` rows decompose those totals by the tax
// base the revenue lands in. Filtering on scope avoids the double-counting a
// single mixed column would invite.
export function buildStackCsv(layout, gdpDecade, decadeLabel, subtitles) {
  var allRows = layout.rows.map(function (r) { return { key: r.key, row: r, isTotal: false }; })
    .concat([{
      key: null, isTotal: true,
      row: { isTotal: true, stat: layout.total.statSeg, mech: layout.total.mechSeg, conv: layout.total.convSeg }
    }]);
  var out = [[
    'budget_window', 'position', 'policy', 'settings', 'stage', 'scope', 'tax_base',
    'revenue_usd_billions', 'share_of_gdp_percent'
  ]];
  allRows.forEach(function (entry, i) {
    var label = entry.isTotal ? 'Whole package' : metaFor(entry.key).label;
    var settings = entry.isTotal ? '' : ((subtitles && subtitles[entry.key]) || '');
    var position = entry.isTotal ? '' : String(i + 1);
    var heads = csvHeads(entry.row);
    RUNGS.forEach(function (u) {
      var seg = entry.row[u.k] || {};
      var line = function (scope, base, value) {
        out.push([
          decadeLabel, position, label, settings, u.label, scope, base,
          value.toFixed(3), (value / gdpDecade * 100).toFixed(4)
        ]);
      };
      line('total', 'All bases', segNet(seg));
      heads.forEach(function (h) { line('base', headLabel(h), seg[h] || 0); });
    });
  });
  return out;
}

// ---- export image -----------------------------------------------------------
// A standalone re-render of what is on screen, laid out the way the vendored
// engine lays out its own PNG exports (vendor/chart-engine/live.js): 1000px wide
// on a 40px margin, a 22px bold navy title wrapped clear of the wordmark, a
// muted subtitle, a swatch legend, and the Budget Lab wordmark top right. Same
// rungs, same tint-and-opacity ladder, same two numeric columns as the screen,
// plus the budget window and each policy's dial settings, so a PNG dropped into
// a deck says what it is. Colors resolve to literal hex from the live page's
// --tbl-* properties, since a rasterized SVG cannot resolve custom properties.
var EX = {
  W: 1000, margin: 40, labelW: 200, tagsW: 116, dolW: 78, numW: 126,
  gap: 12, rowH: ROW_H, legendLineH: 18, stepLane: 58,
  logoW: 150, titleSize: 22, titleLead: 27
};

function resolveHeadHex(head, step) { var hue = headHue(head); return cssVar(hueVar(hue, step), hueHex(hue, step)); }

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// esc() is for SVG text NODES, where a bare quote is legal; an attribute value
// needs the quote escaped too or a label containing one truncates the attribute
// and spills the rest into the tag.
function escAttr(str) { return esc(str).replace(/"/g, '&quot;'); }

// Greedy wrap on an estimated glyph width. No canvas measureText: this has to
// produce the same layout in a headless test as in the browser.
function wrapText(text, maxWidth, perChar) {
  var words = String(text).split(/\s+/), lines = [], line = '';
  words.forEach(function (w) {
    var next = line ? line + ' ' + w : w;
    if (next.length * perChar > maxWidth && line) { lines.push(line); line = w; }
    else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

function exportBarSvg(seg, rung, y, xzAbs, sc, heads) {
  var xp = xzAbs, xn = xzAbs, out = '';
  var rect = function (h, v, x, drained) {
    var w = Math.abs(v) * sc;
    var op = rung.opacity * (drained ? 0.8 : 1);
    return '<rect x="' + x.toFixed(1) + '" y="' + (y + rung.y) + '" width="' + Math.max(0.5, w - 1).toFixed(1)
      + '" height="' + rung.h + '" fill="' + resolveHeadHex(h, rung.step) + '"'
      + (op < 1 ? ' opacity="' + op.toFixed(2) + '"' : '') + '/>';
  };
  heads.forEach(function (h) {
    var v = seg[h] || 0; if (v <= 0) return;
    out += rect(h, v, xp, false); xp += v * sc;
  });
  heads.forEach(function (h) {
    var v = seg[h] || 0; if (v >= 0) return;
    xn -= -v * sc; out += rect(h, v, xn, true);
  });
  return out;
}

// The export's counterpart to gridSvg, banded to one row's y range. It exists
// because the export previously drew ONLY the zero line while axisSvg went on
// printing a label at every tick — a downloaded PNG with labelled tick positions
// and nothing to read them against. Same treatment as the screen (solid 1px,
// zero on the axis token, everything else on the gridline token), but the
// strokes arrive pre-resolved to literal hex: a rasterized SVG has no stylesheet
// to resolve a custom property against. Callers must emit this BEFORE the row's
// bars — SVG paints in document order, so a grid emitted after would sit on top.
// The zero line is safe to fold into the tick loop rather than draw separately:
// layoutStack's tick range runs from ceil(-negMax) to floor(posMax), which always
// straddles zero, so tick 0 is present in every layout.
function exportGridSvg(ticks, y, xzAbs, sc, h, zeroHex, gridHex) {
  return ticks.map(function (t) {
    var x = (xzAbs + t * sc).toFixed(1), zero = Math.abs(t) < 1e-6;
    return '<line x1="' + x + '" x2="' + x + '" y1="' + y + '" y2="' + (y + h)
      + '" stroke="' + (zero ? zeroHex : gridHex) + '" stroke-width="1"/>';
  }).join('');
}

export function buildStackExportSvg(layout, gdpDecade, opts) {
  var o = opts || {};
  var decadeLabel = o.decadeLabel || '';
  var subtitles = o.dialSubtitles || {};
  var title = o.title || 'Revenue one policy at a time, before and after mechanical and behavioral effects';

  var ink = cssVar('--tbl-text-heading', '#1A1A2E');
  var body = cssVar('--tbl-text-body', '#4A4A4A');
  var muted = cssVar('--tbl-text-muted', '#6D6D6D');
  var border = cssVar('--tbl-border', '#E5E5E5');
  var axisStroke = cssVar('--tbl-axis-stroke', '#999999');
  var gridline = cssVar('--tbl-gridline', '#F0F0F0');
  var green = cssVar('--tbl-green-400', '#127B2C');
  var red = cssVar('--tbl-red-400', '#C13933');
  var bg = cssVar('--tbl-bg', '#FFFFFF');
  var navy = cssVar('--tbl-navy', '#1A1A2E');
  // Resolved from the live page's own --tbl-font-sans (Figtree/Mallory) rather
  // than a generic literal, so a downloaded file still carries Budget Lab's
  // typeface stack. No monospace counterpart: the engine never uses one.
  var font = cssVar('--tbl-font-sans', 'Figtree, system-ui, -apple-system, Segoe UI, Arial, sans-serif');

  var text = function (x, y, str, size, fill, extra) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-family="' + font
      + '" fill="' + fill + '"' + (extra || '') + '>' + esc(str) + '</text>';
  };

  var M = EX.margin, W = EX.W, innerW = W - M * 2;
  var barX = M + EX.labelW + EX.tagsW + EX.gap;
  var numRight = W - M, numLeft = numRight - EX.numW;
  var dolRight = numLeft - EX.gap, dolLeft = dolRight - EX.dolW;
  var barW = dolLeft - EX.gap - barX;
  var sc = barW / layout.scale, xzAbs = barX + layout.negMax * sc;
  var tagsRight = M + EX.labelW + EX.tagsW;

  var allRows = layout.rows.map(function (r) { return { key: r.key, row: r, isTotal: false }; })
    .concat([{
      key: null, isTotal: true,
      row: { isTotal: true, stat: layout.total.statSeg, mech: layout.total.mechSeg, conv: layout.total.convSeg }
    }]);
  var heads = usedHeads(allRows.map(function (e) { return e.row; }));

  // The title wraps clear of the wordmark, exactly as the engine's export does.
  var titleLines = wrapText(title, innerW - EX.logoW - 24, EX.titleSize * 0.5);
  var firstBaseline = M + EX.titleSize;
  var head = titleLines.map(function (ln, i) {
    return text(M, firstBaseline + i * EX.titleLead, ln, EX.titleSize, navy, ' font-weight="800"');
  }).join('');

  var logoH = EX.logoW / LOGO_ASPECT;
  head += '<image x="' + (W - M - EX.logoW) + '" y="' + (firstBaseline - logoH * 0.87).toFixed(1)
    + '" width="' + EX.logoW + '" height="' + logoH.toFixed(1) + '" href="' + LOGO_DATA_URI
    + '" xlink:href="' + LOGO_DATA_URI + '"/>';

  var y = firstBaseline + (titleLines.length - 1) * EX.titleLead + 22;
  head += text(M, y, 'Total revenue over ' + decadeLabel + '.', 13, muted);
  y += 26;

  var legend = exportLegendLine(heads, function (h) { return resolveHeadHex(h, SCORE_RUNG.step); },
    headLabel, y, ink, font, W - M);
  y = legend.endY + 15;
  head += legend.svg;
  // No reading key here. One used to be hardcoded on this line, and it drifted
  // twice over: the page's own key had grown two clauses the export never picked
  // up, and then the key was removed from the page altogether -- leaving the
  // downloaded image explaining the figure in wording the page no longer used.
  // The export already prints each rung's tag beside every row (RUNGS[].tag), so
  // a key restates what is on every line of the image.

  var rowsSvg = '';
  allRows.forEach(function (entry) {
    var row = entry.row, isTotal = entry.isTotal;
    if (isTotal) {
      y += 10;
      rowsSvg += '<line x1="' + M + '" x2="' + (W - M) + '" y1="' + (y - 5) + '" y2="' + (y - 5)
        + '" stroke="' + border + '"/>';
    }
    var label = isTotal ? 'Whole package' : metaFor(entry.key).label;
    var settings = isTotal ? '' : (subtitles[entry.key] || '');
    var lines = wrapText(label, EX.labelW - 8, 6);
    lines.forEach(function (ln, li) {
      rowsSvg += text(M, y + 14 + li * 14, ln, 12, ink, isTotal ? ' font-weight="800"' : '');
    });
    if (settings) rowsSvg += text(M, y + 16 + lines.length * 14, settings, 10, muted);

    rowsSvg += exportGridSvg(layout.ticks, y, xzAbs, sc, EX.rowH, axisStroke, gridline);
    rowsSvg += RUNGS.map(function (u) { return exportBarSvg(row[u.k] || {}, u, y, xzAbs, sc, heads); }).join('');

    rungLevels(row, gdpDecade).forEach(function (l) {
      var cy = y + l.rung.y + l.rung.h / 2 + 3.5;
      var isScore = l.rung.k === SCORE_RUNG.k;
      rowsSvg += text(tagsRight, cy, l.rung.tag, 8.5, isScore ? body : muted, ' text-anchor="end"');
      rowsSvg += text(dolRight, cy, usd(l.value), isScore ? 11.5 : 10, isScore ? body : muted, ' text-anchor="end"');
      rowsSvg += text(numRight, cy, pgs(l.value, gdpDecade), isScore ? 13.5 : 10.5, ink,
        ' text-anchor="end"' + (isScore ? ' font-weight="' + (isTotal ? '800' : '600') + '"' : ''));
      var st = stepText(l.step);
      if (st.text) {
        rowsSvg += text(numLeft + EX.stepLane, cy, st.text, 9.5,
          st.dir === 0 ? muted : (st.dir < 0 ? red : green), ' text-anchor="end"');
      }
    });
    y += EX.rowH;
  });

  var axisY = y + 6;
  var axisSvg = layout.ticks.map(function (t) {
    return text(xzAbs + t * sc, axisY + 10, Math.abs(t) < 1e-6 ? '0' : pgs(t, gdpDecade), 10, muted, ' text-anchor="middle"');
  }).join('');
  var chartH = Math.round(axisY + 16 + M);

  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
    + ' viewBox="0 0 ' + W + ' ' + chartH + '" width="' + W + '" height="' + chartH + '">'
    + '<rect x="0" y="0" width="' + W + '" height="' + chartH + '" fill="' + bg + '"/>'
    + head + rowsSvg + axisSvg
    + '</svg>';
}

// One wrapped, swatch+label legend line for the export image. Returns the markup
// plus the y the next line should start at.
function exportLegendLine(keys, colorHexFn, labelFn, startY, ink, font, rightEdge) {
  // Swatch geometry is the engine's own rect swatch (.tbl-legend-swatch.is-rect).
  var legendY = startY, legendX = EX.margin, swW = 14, swH = 12, svg = '';
  keys.forEach(function (k) {
    var label = labelFn(k), width = swW + 18 + label.length * 6.6;
    if (legendX + width > rightEdge) { legendY += EX.legendLineH; legendX = EX.margin; }
    svg += '<rect x="' + legendX + '" y="' + (legendY - swH + 2) + '" width="' + swW + '" height="' + swH + '" rx="1" fill="' + colorHexFn(k) + '"/>'
      + '<text x="' + (legendX + swW + 6) + '" y="' + legendY + '" font-size="12" font-family="' + font + '" fill="' + ink + '">' + esc(label) + '</text>';
    legendX += width;
  });
  return { svg: svg, endY: legendY };
}

function buildExportSvgElement(layout, gdpDecade, opts) {
  var host = document.createElement('div');
  host.innerHTML = buildStackExportSvg(layout, gdpDecade, opts);
  return host.querySelector('svg');
}

function downloadControlHtml() {
  var icon = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10"/></svg>';
  return '<div class="figure-meta"><div class="figure-meta-text"></div><div class="figure-downloads">'
    + '<button type="button" class="figure-download-btn" data-export="csv" aria-label="Download the package score (CSV)">' + icon + '<span>Data</span></button>'
    + '<button type="button" class="figure-download-btn" data-export="png" aria-label="Download chart (PNG)">' + icon + '<span>Image</span></button>'
    + '</div></div>';
}

function wireDownloads(el, layout, gdpDecade, opts) {
  var meta = el.querySelector('.figure-meta');
  if (!meta) return;
  meta.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.figure-download-btn') : null;
    if (!btn) return;
    if (btn.getAttribute('data-export') === 'csv') {
      downloadCSV(buildStackCsv(layout, gdpDecade, opts.decadeLabel, opts.dialSubtitles),
        'taxes-at-the-top-package-score.csv');
      return;
    }
    var label = btn.querySelector('span');
    var original = label ? label.textContent : '';
    btn.disabled = true;
    if (label) label.textContent = '…';
    downloadPNG(buildExportSvgElement(layout, gdpDecade, opts), 'taxes-at-the-top-package.png')
      .catch(function (err) { console.error('Stack chart PNG export failed:', err); })
      .then(function () {
        btn.disabled = false;
        if (label) label.textContent = original;
      });
  });
}

// Renders the stack view into `el` and wires pointer-drag reordering.
// `marginals` is model.stackMarginals(s, order, dec)'s output — the row order IS
// the order the caller passed in (marginals.rows[i].key), so there's no separate
// `order` argument to keep in sync. Calls onReorder(newOrder) with the dragged
// order; app.js owns the order, recomputes marginals for it (a real recompute —
// the per-row split IS order-dependent) and re-mounts.
// `opts`: { dialSubtitles: {leverKey: string}, gdpDecade: number,
//           decadeLabel: string, title: string }. gdpDecade is required: share
// of the selected decade's GDP is this view's primary unit.
export function mountStack(el, marginals, onReorder, opts) {
  if (!el) return;
  // No early return on an empty package. With nothing switched on, the figure
  // still draws its whole-package row — zeroed, on its own axis — so the reader
  // arrives at a chart that shows what it is about to fill in rather than at a
  // blank space where a chart will later appear. layoutStack handles the empty
  // case on its own (scale 1, a single zero tick, all segments zero).
  var o = opts || {};
  var gdpDecade = o.gdpDecade;
  if (!gdpDecade) throw new Error('mountStack: opts.gdpDecade is required (share of GDP is the primary unit)');
  var decadeLabel = o.decadeLabel || '';
  var subtitles = o.dialSubtitles || {};
  var order = marginals.rows.map(function (r) { return r.key; });
  var layout = layoutStack(marginals, gdpDecade);
  var bw = Math.max(140, widthOf(el) - 18 - 140 - 112 - 72 - 124 - 50);
  var xz = layout.negMax * (bw / layout.scale), sc = bw / layout.scale;

  layout.rows.forEach(function (r) { r.subtitle = subtitles[r.key] || ''; });
  var totalRow = {
    key: null, isTotal: true,
    stat: layout.total.statSeg, mech: layout.total.mechSeg, conv: layout.total.convSeg
  };
  var heads = usedHeads(layout.rows.concat([totalRow]));

  var html = layout.rows.map(function (r) {
    return rowHtml(r, bw, xz, sc, layout.ticks, heads, gdpDecade, decadeLabel, order.length);
  }).join('')
    + rowHtml(totalRow, bw, xz, sc, layout.ticks, heads, gdpDecade, decadeLabel, order.length)
    + axisHtml(layout.ticks, bw, xz, sc, gdpDecade);

  // Engine order: legend above the plot, downloads below it (see the distribution
  // figure, which the engine lays out that way itself). Nothing else goes up here:
  // a terse reading key used to sit beside the legend restating the three rungs,
  // which the .mtag column already names on every row — so the reader met the same
  // three names twice before reaching the bars.
  //
  // .mstack-note carries those names for the ONE case where the column cannot:
  // below a 700px container the row cannot fit .mtag and styles.css drops it, and
  // with it the only on-screen thing naming the three stages (the legend keys tax
  // BASES, not rungs). The element is always emitted and revealed by the container
  // query, rather than being generated content, so it is translatable and reaches
  // assistive technology. It is hidden at every width where .mtag is visible.
  //
  // The legend keys tax bases, so an empty package has nothing to key and the row
  // is omitted rather than drawn empty.
  el.innerHTML = (heads.length ? '<div class="mstack-head"><div class="legend mstack-legend">' + legendHtml(heads) + '</div></div>' : '')
    + '<div class="mstack">' + html + '</div>'
    + rungKeyHtml()
    + '<div class="mstack-footer">' + downloadControlHtml() + '</div>';

  wireTooltipDelegation();
  wireStackDrag(el, order, onReorder);
  wireDownloads(el, layout, gdpDecade, { decadeLabel: decadeLabel, dialSubtitles: subtitles, title: o.title });
}

// A keyboard move changes a result, not just a position, so it has to be spoken.
// The region is parked on <body> rather than inside `el` on purpose: mountStack
// re-renders by assigning el.innerHTML, so a region living in there would be a
// brand-new node on every move, and assistive technology announces CHANGES to a
// live region that was already in the tree — not the insertion of a populated
// one. index.html's persistent #tt is the same pattern for the same reason.
//
// The clip comes from styles.css's `.visually-hidden` utility: the standard 1px
// clip-rect, read by AT with zero visual footprint and — unlike display:none or
// visibility:hidden — still announced.
var LIVE_EL = null;
function liveRegion() {
  if (typeof document === 'undefined') return null;
  if (LIVE_EL && LIVE_EL.isConnected) return LIVE_EL;
  LIVE_EL = document.getElementById('mstack-live');
  if (!LIVE_EL) {
    LIVE_EL = document.createElement('div');
    LIVE_EL.id = 'mstack-live';
    LIVE_EL.setAttribute('role', 'status');
    LIVE_EL.setAttribute('aria-live', 'polite');
    LIVE_EL.className = 'visually-hidden';
    document.body.appendChild(LIVE_EL);
  }
  return LIVE_EL;
}

function announce(msg) {
  var r = liveRegion();
  if (r) r.textContent = msg;
}

function wireStackDrag(el, order, onReorder) {
  var host = el.querySelector('.mstack');
  if (!host) return;
  var dragKey = null, current = order.slice();

  // onReorder (app.js) re-mounts the whole view synchronously on every move,
  // replacing `host` — so row lookups must re-query `el` each time rather than
  // close over the element that existed when the drag started.
  function liveHost() { return el.querySelector('.mstack'); }
  function keyUnder(y) {
    var h = liveHost();
    if (!h) return null;
    var els = h.querySelectorAll('.mrow[data-key]');
    for (var i = 0; i < els.length; i++) {
      var rc = els[i].getBoundingClientRect();
      if (y >= rc.top && y <= rc.bottom) return els[i].getAttribute('data-key');
    }
    return null;
  }
  function mark() {
    if (dragKey == null) return;
    var h = liveHost();
    var row = h && h.querySelector('.mrow[data-key="' + dragKey + '"]');
    if (row) row.classList.add('dragging');
  }
  function unmark() {
    var h = liveHost();
    var row = h && h.querySelector('.mrow.dragging');
    if (row) row.classList.remove('dragging');
  }
  function onMove(e) {
    if (dragKey == null) return;
    e.preventDefault();
    var over = keyUnder(e.clientY);
    if (over && over !== dragKey) {
      var from = current.indexOf(dragKey), to = current.indexOf(over);
      if (from >= 0 && to >= 0) {
        current.splice(from, 1); current.splice(to, 0, dragKey);
        onReorder(current.slice()); // re-mounts synchronously, wiping the dragging class
        mark();                     // ...so reapply it to the freshly-mounted row
      }
    }
  }
  function endDrag() {
    dragKey = null;
    setTipSuppressed(false);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    unmark();
  }
  function onUp() { endDrag(); }
  function onCancel() { endDrag(); }
  host.addEventListener('pointerdown', function (e) {
    var g = e.target && e.target.closest ? e.target.closest('.mgrip') : null;
    if (!g || g.classList.contains('ghost')) return;
    var row = g.closest('.mrow'), k = row && row.getAttribute('data-key');
    if (!k) return;
    dragKey = k;
    setTipSuppressed(true);   // the row's own hover card would sit under the pointer
    mark();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    e.preventDefault();
  });

  // Keyboard path, bound to the same freshly-queried host as the pointer path so
  // the two share a lifetime. Arrow Up/Down move the focused row one place.
  function focusGrip(k) {
    var h = liveHost();
    var g = h && h.querySelector('.mrow[data-key="' + k + '"] .mgrip');
    if (g && g.focus) g.focus();
  }
  function moveByKey(k, delta) {
    var from = current.indexOf(k), to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) return;   // already at an end
    current.splice(from, 1);
    current.splice(to, 0, k);
    onReorder(current.slice());   // re-mounts synchronously, destroying the focused button
    focusGrip(k);                 // ...so put focus back on the same row's NEW grip;
                                  // without this a second press has nothing to act on
    announce(metaFor(k).label + ' moved to position ' + (to + 1) + ' of ' + current.length);
  }
  host.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    var g = e.target && e.target.closest ? e.target.closest('.mgrip') : null;
    if (!g || g.classList.contains('ghost')) return;
    var row = g.closest('.mrow'), k = row && row.getAttribute('data-key');
    if (!k) return;
    // Prevented whether or not the row can actually move: the page scrolling out
    // from under a focused control at either end of the list is worse than a
    // key that does nothing.
    e.preventDefault();
    moveByKey(k, e.key === 'ArrowUp' ? -1 : 1);
  });
}
