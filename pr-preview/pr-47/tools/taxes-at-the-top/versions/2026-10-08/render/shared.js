// tools/taxes-at-the-top/render/shared.js
//
// Formatting + color helpers shared by both views (distribution, stack).
// Ported from the reference prototype's global helpers: svg, usd/usdShort,
// pg/pgs, headColor.
//
// headColor is consumed only by hand-built SVG (render/stack.js) — the
// engine's own `series_colors` (render/distribution.js) takes bare hue-name
// literals directly per CONFIG-SPEC.md, never through this function. It
// returns a resolved var(--tbl-*) reference (see hueVar), not the bare hue
// name: 'amber'/'rose'/'russet' aren't valid CSS/SVG color keywords, so a
// custom-SVG fill/background using them rendered solid black (invalid-value
// fallback) — use the result in a `style` attribute, not the bare `fill=`
// presentation attribute, for guaranteed cross-browser var() resolution.

export function svg(w, h) {
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" preserveAspectRatio="xMidYMid meet">';
}

export function usd(b) {
  var v = Math.abs(b), sg = b < 0 ? '−' : '';
  return v >= 1000 ? sg + '$' + (v / 1000).toFixed(2) + 'T' : sg + '$' + Math.round(v) + 'B';
}

export function usdShort(b) {
  var v = Math.abs(b), sg = b < 0 ? '−' : '';
  return v >= 1000 ? sg + '$' + (v / 1000).toFixed(1) + 'T'
    : v >= 10 ? sg + '$' + Math.round(v) + 'B'
    : sg + '$' + v.toFixed(1) + 'B';
}

export function pg(b, gdpDecade) {
  return (b / gdpDecade * 100).toFixed(2) + '%';
}

// Signed share of a decade's GDP — the stack view's primary unit. Real minus
// sign (U+2212), matching usd/usdShort above. A value that rounds to zero prints
// unsigned: "−0.00%" reads as a real (if tiny) loss when it is just zero.
export function pgs(b, gdpDecade) {
  var pct = Math.abs(b / gdpDecade * 100).toFixed(2);
  return (b < 0 && parseFloat(pct) !== 0 ? '−' : '') + pct + '%';
}

// Direction of a value at the precision it is PRINTED at: 0 when it rounds away.
// A caret or an arrow must never claim a movement the number beside it denies —
// the same rule stepText applies to the step arrows.
export function dirAtPrecision(value, decimals) {
  if (parseFloat(Math.abs(value).toFixed(decimals)) === 0) return 0;
  return value < 0 ? -1 : 1;
}

// The same share rounded to the two decimals pgs prints. A step delta between
// two rungs is computed from these, not from the raw values, so the printed
// arrow always equals the difference of the two printed levels.
export function roundedPg(b, gdpDecade) {
  var p = b / gdpDecade * 100;
  return (p < 0 ? -1 : 1) * parseFloat(Math.abs(p).toFixed(2));
}

// Tax-head -> engine categorical hue name. Fixed per head, not
// palette-cycled, so a head keeps the same color everywhere. This table was
// already static; the "shifting" Sylva saw (Task 15) came from
// render/stack.js's now-removed LEVER_COLORS, a second per-LEVER map that
// tinted one of two levers sharing a head (est: deemed/estate; iit: ord/qbi)
// depending on which was active — gone now that the total row colors by
// head through this one table instead. Excludes 'blue' (reserved by the
// distribution card, Task 14): iit moves off blue onto russet, and 'other'
// (never actually emitted — no lever's head resolves to it, see
// LEVERS_META) takes the freed-up neutral 'dim' instead of doubling up.
var HEAD_HUES = {
  iit: 'russet', pay: 'amber', est: 'violet', wealth: 'green', corp: 'red',
  cg: 'rose', other: 'dim'
};
export function headHue(head) {
  return HEAD_HUES[head] || HEAD_HUES.other;
}

// Fixed display order for tax bases, biggest-and-most-familiar first. Every
// consumer (bar segments left to right, legend, tooltip breakdown, CSV rows,
// the export image) orders by this and nothing else — so a base keeps its
// position as well as its color when the policy rows are dragged around.
// Deliberately independent of DATA.meta.surrogate.heads_order, which is the
// surrogate's own vector layout and carries no display intent.
var HEAD_ORDER = ['iit', 'cg', 'corp', 'est', 'wealth', 'pay', 'other'];
export function headsInOrder(heads) {
  var present = {};
  heads.forEach(function (h) { present[h] = true; });
  var out = HEAD_ORDER.filter(function (h) { return present[h]; });
  // Anything not in the table (a base a future vintage adds) still renders,
  // after the known ones, rather than silently disappearing.
  heads.forEach(function (h) { if (HEAD_ORDER.indexOf(h) < 0 && out.indexOf(h) < 0) out.push(h); });
  return out;
}

// Hue name -> the --tbl-* custom property carrying that hue, per tint tier.
// Single source of truth for hue -> token, reused by headColor below
// (on-screen, resolves through the page's own stylesheet) and by
// render/stack.js's standalone export SVG (which needs the same hue
// resolved to a literal hex via cssVar, since a downloaded/rasterized SVG
// has no access to this page's stylesheet). No 'blue' entry: nothing in
// HEAD_HUES ever names it, so a future head accidentally added as 'blue'
// falls through hueVar's own fallback instead of silently resolving.
//
// Each hue carries a three-step light -> dark ladder, which is how the stack
// view distinguishes its three rungs (first-order / +mechanical / +behavioral)
// within one tax base's color. The LADDER is palette tokens rather than opacity,
// so segments stay legible over gridlines and rasterize identically in the PNG
// export. This is not a claim that the view uses no opacity: the stack figure
// additionally applies a per-rung opacity (RUNGS in stack.js: 0.55/0.75/1, and a
// further 0.8 on a drained segment) ON TOP of this ladder. Two axes, not one —
// the engine-request docs previously read this comment as the latter and
// described the view wrongly to the engine maintainer.
// Callers name the STEP (1/2/3), not a Style-Guide tier number, because the
// tiers are not the same for every hue: amber's -400 (#985E00) is a dark brown
// that reads as a second russet rather than as amber, so amber's ladder is
// pitched two steps lighter (50/100/200) to land on an actual gold. Every other
// hue uses 200/300/400. 'dim' is a flat neutral with no ladder — no tax head
// resolves to it in practice.
var STEPS = [1, 2, 3];
var HUE_VAR = {
  amber: { 1: '--tbl-amber-50', 2: '--tbl-amber-100', 3: '--tbl-amber-200' },
  violet: { 1: '--tbl-violet-200', 2: '--tbl-violet-300', 3: '--tbl-violet-400' },
  green: { 1: '--tbl-green-200', 2: '--tbl-green-300', 3: '--tbl-green-400' },
  red: { 1: '--tbl-red-200', 2: '--tbl-red-300', 3: '--tbl-red-400' },
  rose: { 1: '--tbl-rose-200', 2: '--tbl-rose-300', 3: '--tbl-rose-400' },
  russet: { 1: '--tbl-russet-200', 2: '--tbl-russet-300', 3: '--tbl-russet-400' },
  dim: { 1: '--tbl-annotation-dim', 2: '--tbl-annotation-dim', 3: '--tbl-annotation-dim' }
};

// `step` defaults to 3, the full-strength end of the ladder — what every
// non-stack caller wants.
function stepOf(step) {
  return STEPS.indexOf(step) >= 0 ? step : 3;
}

export function hueVar(hue, step) {
  return (HUE_VAR[hue] || HUE_VAR.dim)[stepOf(step)];
}

export function headColor(head, step) {
  return 'var(' + hueVar(headHue(head), step) + ')';
}

// hueVar's literal hex, one per hue name (mirrors assets/style-guide/
// colors.css's *-400 tiers + --tbl-annotation-dim) — the fallback
// render/stack.js's export-SVG resolver passes to cssVar. A single
// generic hex for every head would make every export segment the same
// wrong color outside a browser (bare `node --test` has no
// getComputedStyle, so cssVar always takes this fallback there); a
// per-hue fallback keeps the export correct, and tests able to verify
// per-base distinctness, in that environment too.
var HUE_HEX = {
  amber: { 1: '#FFC63D', 2: '#F4AB1A', 3: '#D59000' },
  violet: { 1: '#BC85F4', 2: '#9F6BD7', 3: '#8452BB' },
  green: { 1: '#54B15C', 2: '#379644', 3: '#127B2C' },
  red: { 1: '#FF7062', 2: '#E1554A', 3: '#C13933' },
  rose: { 1: '#D783B2', 2: '#BB6997', 3: '#9F507D' },
  russet: { 1: '#C3946F', 2: '#A77A56', 3: '#8B623F' },
  dim: { 1: '#BBBBBB', 2: '#BBBBBB', 3: '#BBBBBB' }
};
export function hueHex(hue, step) {
  return (HUE_HEX[hue] || HUE_HEX.dim)[stepOf(step)];
}

// Read a --tbl-* custom property's live, literal value off the page. Used
// to bake a real hex into a standalone/downloaded SVG (see above). Returns
// `fallback` outside a browser (tests) or if the property isn't set.
export function cssVar(name, fallback) {
  if (typeof getComputedStyle === 'undefined' || typeof document === 'undefined') return fallback;
  var v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v && v.trim()) || fallback;
}

// ---- shared rich hover tooltip (stack segments + distribution dumbbell) ---
// Ported from app.code.js:350-376. Interactive marks carry a data-tip attribute
// holding a JSON cfg; one delegated document listener reads it on hover, so the
// card survives every innerHTML re-render without per-element listener rewiring.
export function tipEnc(cfg) {
  return JSON.stringify(cfg)
    .replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function tipAttr(cfg) {
  return "data-tip='" + tipEnc(cfg) + "'";
}

// Hover card: the reference prototype's content, in the vendored engine's visual
// idiom (chart-engine.css's .tbl-tooltip* classes — frosted panel, bold head,
// swatch/label/value rows).
//
// cfg: { head, meta, glyph, glyphColor, amount, sub,
//        rows: [{color, label, alt, value, current}], note }
//
// A row's `alt` is a second figure in its own lane left of `value` — the stack
// view puts dollars there beside the share of GDP. Omit it and the lane
// collapses.
//
// `head` names the thing hovered; `meta` is the smaller line under it for the
// settings and the period it applies to. Each part carries ONE kind of thing,
// which is also what keeps the card inside its own width: the hovered figure and
// its dollar equivalent go on the hero line, the rows carry bare percentages, and
// the long strings (head, meta, note) are the ones allowed to wrap. Packing a
// unit and a dollar total into a `nowrap` row is what previously ran text off the
// card's right edge.
// The engine draws a series' key as SVG — a hatch glyph, a hollow ring, a circle, a rect —
// and hands hooks.tooltip its own rendered card in ctx.rendered. A hook that replaces that
// card's content must carry those keys over, because a CSS-coloured box cannot express a
// pattern or a marker shape: the hatch flattens to its ground colour and every circle
// becomes a square. Rows come back in ctx.series order (verified against 1.12.0 for both
// the stacked and dumbbell cards), so they map by position; the Total row is skipped since
// its swatch is a deliberate empty spacer.
export function engineSwatches(rendered, series) {
  var out = {};
  if (!rendered || !series || !series.length) return out;
  var rowRe = /<div class="tbl-tooltip-row([^"]*)">([\s\S]*?)<\/div>/g;
  var i = 0, m;
  while ((m = rowRe.exec(rendered)) !== null) {
    if (m[1].indexOf('--total') !== -1) continue;
    var swatch = /<span class="tbl-tooltip-swatch"[^>]*>[\s\S]*?<\/span>/.exec(m[2]);
    if (swatch && i < series.length) out[series[i]] = swatch[0];
    i++;
  }
  return out;
}

// A row's swatch keys the mark it names, which for a hollow marker means a RING, not
// a filled box: the rate view's hollow dot is the plan's ask and its filled dot is
// what gets collected, so a filled swatch for both would key two different marks the
// same. (The engine reached the same conclusion in 1.11.0, where a hollow legend key
// became a genuine hole.)
function swatchStyle(r) {
  var color = r.color || 'var(--tbl-text-muted)';
  return r.hollow
    ? 'background:var(--tbl-bg);box-shadow:inset 0 0 0 2px ' + color
    : 'background:' + color;
}

export function tipCard(c) {
  // Wrapped in .tt-card so the styling is host-agnostic: this markup lands in the tool's
  // own #tt element (the stack figure) AND inside the engine's .tbl-tooltip card (the
  // distribution views, via hooks.tooltip). Scoping the rules to #tt would style only
  // the first.
  var h = '';
  if (c.head) h += '<div class="tbl-tooltip-head">' + c.head + '</div>';
  if (c.meta) h += '<div class="tt-meta">' + c.meta + '</div>';
  if (c.amount != null) {
    h += '<div class="tt-hero">'
      + (c.glyph ? '<span class="tt-glyph" style="color:' + (c.glyphColor || 'var(--tbl-text-muted)') + '">' + c.glyph + '</span>' : '')
      + '<span class="tt-amount">' + c.amount + '</span>'
      + (c.sub ? '<span class="tt-sub">' + c.sub + '</span>' : '')
      + '</div>';
  }
  if (c.rows && c.rows.length) {
    // `current` marks the row the pointer is actually on — the head names the
    // policy and the base, so this is what says which of the three you're reading.
    h += '<div class="tt-rows">' + c.rows.map(function (r) {
      // `summary` is a derived row — a difference between rows above it, not a
      // mark on the chart. It keeps the row grid so its number aligns with the
      // rest, but takes an empty swatch slot rather than a coloured box, because
      // a swatch here would key a mark the reader cannot go and find.
      return '<div class="tbl-tooltip-row' + (r.current ? ' is-current' : '')
        + (r.summary ? ' is-summary' : '') + '">'
        + (r.summary ? '<span class="tbl-tooltip-swatch is-blank"></span>'
          : (r.swatch || '<span class="tbl-tooltip-swatch" style="' + swatchStyle(r) + '"></span>'))
        + '<span class="tbl-tooltip-label">' + r.label + '</span>'
        + (r.alt ? '<span class="tt-alt">' + r.alt + '</span>' : '')
        + '<span class="tbl-tooltip-value">' + r.value + '</span></div>';
    }).join('') + '</div>';
  }
  if (c.note) h += '<div class="tt-note">' + c.note + '</div>';
  return '<div class="tt-card">' + h + '</div>';
}

var TTEL = null, TTCUR = null, wired = false, suppressed = false;

// Hover cards are noise during a drag-reorder: the pointer is over a row the
// whole time, and the row it describes is being recomputed under it.
export function setTipSuppressed(v) {
  suppressed = !!v;
  if (suppressed) tipHide();
}

export function tipShow(cfg, x, y) {
  if (!TTEL) TTEL = document.querySelector('#tt');
  if (!TTEL) return;
  TTEL.hidden = false;
  TTEL.innerHTML = tipCard(cfg);
  TTEL.classList.add('show');
  tipMove(x, y);
}

export function tipMove(x, y) {
  if (!TTEL) return;
  var pad = 15, tw = TTEL.offsetWidth, th = TTEL.offsetHeight, px = x + pad, py = y + pad;
  if (px + tw > window.innerWidth - 8) px = x - tw - pad;
  if (px < 8) px = 8;
  if (py + th > window.innerHeight - 8) py = y - th - pad;
  if (py < 8) py = 8;
  TTEL.style.left = px + 'px'; TTEL.style.top = py + 'px';
}

export function tipHide() {
  TTCUR = null;
  if (TTEL) TTEL.classList.remove('show');
}

// One document-wide delegated listener drives every chart's tooltip; safe to call
// on every mount (idempotent) so each view doesn't need its own wiring/teardown.
export function wireTooltipDelegation() {
  if (wired || typeof document === 'undefined') return;
  wired = true;
  document.addEventListener('mousemove', function (e) {
    if (suppressed) return;
    var el = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!el) { if (TTCUR) tipHide(); return; }
    if (el !== TTCUR) {
      TTCUR = el;
      try { tipShow(JSON.parse(el.getAttribute('data-tip')), e.clientX, e.clientY); } catch (_err) { /* malformed data-tip: skip */ }
    } else {
      tipMove(e.clientX, e.clientY);
    }
  });
}
