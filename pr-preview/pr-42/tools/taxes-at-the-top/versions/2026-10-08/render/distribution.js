// tools/taxes-at-the-top/render/distribution.js
//
// Distribution card: per-income-group dollar composition (context/new) plus a
// per-group effective-rate dumbbell (rate), reading model.computeDistribution's
// output (Task 9) — NOT computeResults().etr, which is the WRONG per-tax-head
// breakdown the prior version of this file rendered (see git history /
// docs/engine-requests/distribution-measure-simplification.md for that
// deliberately-abandoned approach). Rebuilt per the source's combinedDist/
// combinedEtr intent (scratchpad/app.code.js:419-517), restyled to BL
// conventions rather than copied verbatim. All three views are engine-rendered:
// the dollar views as chartType:'stacked', the rate view as chartType:'dumbbell'
// since engine 1.11.0 (see docs/engine-requests/dumbbell-chart-type.md).
//
// All ten model.meta.PCTS groups split into two panes: MAIN (Quintile 1-5) and
// TOP-DECILE (Top 10/5/1/0.1/0.01%) — the top-decile groups nest inside
// Quintile 5 in the source's own framing, so a shared value scale across panes
// is the correct default (matches the dumbbell spec's "common value scale").

import { tipCard, engineSwatches, dirAtPrecision, usd } from './shared.js';

// Exported so app.js/tests don't hardcode which groups fall in which pane.
export function facetForGroup(group) {
  return group.indexOf('Quintile') === 0 ? 'main' : 'topDecile';
}

var FACET_ORDER = ['main', 'topDecile'];
// Task 20: the top-decile pane's title now discloses the nesting itself — the
// prototype has no equivalent facet (this two-pane split is this tool's own
// construction, see the file-header comment), so there's no source wording to
// port; this is a plain, short statement that the pane is a breakout WITHIN
// Quintile 5, not an additional slice, so a reader summing both panes doesn't
// double-count Quintile 5's income/tax.
var FACET_TITLES = { main: 'By income quintile', topDecile: 'Top decile breakout' };

// ---- dollar composition (context / new) ------------------------------------

// Fixed gray/blue palette (Task 14) — the dollar segments previously reused
// the stack chart's categorical hues (green/blue/violet/rose) below this
// card, which read as interchangeable with the per-lever stack. Kept income
// and current-law tax are neutral background (gray); only the plan's own new
// tax is picked out in color, so collected-vs-lost still reads at a glance.
// This deliberately reserves blue for this card — the stack (Task 15)
// excludes blue from its own palette to avoid the same collision.
//
// 'blue'/'blue-light' are the engine's own resolvable hue names (per
// CONFIG-SPEC.md, see render/shared.js's headColor comment) and resolve to
// Style-Guide --tbl-blue / --tbl-blue-200 (assets/style-guide/colors.css).
// The Style-Guide has no bare-name "light gray"/"dark gray" hue pair, so
// those two are pinned directly: COLOR_DARK_GRAY as 'gray' (the engine's own
// alias for --tbl-text-muted, #6D6D6D) and COLOR_LIGHT_GRAY as the literal
// hex for --tbl-annotation-dim (#BBBBBB) — the palette's other true neutral,
// light enough to read as distinct from the darker current-law-tax segment.
var COLOR_LIGHT_GRAY = '#BBBBBB';   // --tbl-annotation-dim
var COLOR_DARK_GRAY = 'gray';       // --tbl-text-muted (#6D6D6D)
var COLOR_BLUE = 'blue';            // --tbl-blue
var COLOR_BLUE_LIGHT = 'blue-light'; // --tbl-blue-200

// The same four fills as CSS colours, for the tool's own hover card (the spec carries
// palette NAMES, which only the engine resolves). Keyed by the name so the two cannot
// drift apart silently.
var SWATCH_CSS = {
  '#BBBBBB': '#BBBBBB',
  'gray': 'var(--tbl-text-muted)',
  'blue': 'var(--tbl-blue)',
  'blue-light': 'var(--tbl-blue-200)'
};

// The texture on the lost-to-behavior segment (engine `series_patterns`, 1.11.0+),
// a matplotlib hatch character. It is meaning-bearing, not decoration: it marks the
// part of the first-order estimate that behavior stops the government collecting,
// so the segment reads as revenue asked for and not received rather than as one
// more slice of the stack. The captions say "hatched" on the strength of it.
var HATCH_LOST = '/';

// Whitespace between stacked segments (engine `barStack.segmentGap`, 1.11.0+).
// 1px, matching the inset the stack figure gives its own segments
// (render/stack.js barSvg, `w - 1`), so the two figures separate their slices by
// the same amount. Needed most for collectedNew/lostToBehavior: one hue, two
// tiers, which abut into a single block without it.
var SEGMENT_GAP_PX = 1;

// ---- the segment's sign ------------------------------------------------------
//
// `lostToBehavior` is model.js's `staticNew - collectedNew`, and it is NEGATIVE
// whenever behavior RAISES collections above the first-order estimate. That is
// correct arithmetic and a real result, not a model bug: taxing gains at death
// removes the step-up, which kills the lock-in incentive, so realizations rise
// and the base comes in bigger than the first-order estimate assumed. It shows
// up in the modelers' OWN held-out runs, not just in the surrogate — two of the
// 31 fixtures in meta.surrogate.checks report conventional revenue above their
// static totals in all three decades, and both are gains-at-death states
// (pc_wealthr1t1000_deemed, effectively that policy alone, runs 20% above).
// Toggling that one lever on with nothing else reproduces it, so it is a
// first-click state rather than a corner.
//
// The figure carries it as ONE label and a SIGNED value, per Sylva 2026-08-26:
// the segment is always "Lost to behavior", and a negative prints its minus
// sign. A positive takes no explicit "+". Nothing branches on the sign — an
// earlier design switched the label, the subtitle, the caption and the identity
// note together on a per-render flag, which kept the surfaces agreeing with each
// other but made the copy vary under the reader for a difference the number
// already states.
var LABEL_LOST = 'Lost to behavior (not collected)';

// context: the four segments that partition a group's total income (see
// model.js computeDistribution's comment block for the identity these sum to).
var CONTEXT_SEGMENTS = [
  { key: 'afterTaxIncome', label: 'After-tax income', color: COLOR_LIGHT_GRAY },
  { key: 'currentLawTax', label: 'Current-law tax', color: COLOR_DARK_GRAY },
  { key: 'collectedNew', label: 'New tax collected', color: COLOR_BLUE },
  { key: 'lostToBehavior', label: LABEL_LOST, color: COLOR_BLUE_LIGHT, pattern: HATCH_LOST }
];
// new: just the plan's static "ask" (collectedNew + lostToBehavior = staticNew),
// same two fills so collected-vs-lost reads consistently across both views.
var NEW_SEGMENTS = [
  { key: 'collectedNew', label: 'New tax collected', color: COLOR_BLUE },
  { key: 'lostToBehavior', label: LABEL_LOST, color: COLOR_BLUE_LIGHT, pattern: HATCH_LOST }
];

var VIEW_META = {
  context: {
    title: 'Income and tax under current law and the reform',
    subtitle: 'Segments sum to each group’s total income.'
  },
  new: {
    title: 'New taxes added by the reform',
    subtitle: 'The first-order estimate is split into taxes actually collected versus taxes lost to behavioral response.'
  },
  rate: {
    title: 'Effective tax rate by income group',
    subtitle: 'Current law and the reform.'
  }
};

// The card's stable name, as in the reference prototype. The card holds three
// views behind a toggle, so its heading names the CARD; what the current view
// shows is the subtitle's job. (VIEW_META's per-view titles still caption the
// engine chart itself, and so the downloaded image, where a specific view is
// what was exported.)
var DIST_CARD_TITLE = 'Income and taxes by income group';

// The card's header text: the stable title, and the current view's subtitle.
export function distHeader(view) {
  return { title: DIST_CARD_TITLE, subtitle: (VIEW_META[view] || VIEW_META.context).subtitle };
}

// Pure: dist -> {spec, rows} for the engine's chartType:'stacked' bar, faceted
// into the main/top-decile panes via columns.facet + small_multiples. No
// rounding on `value` — the TDD contract holds segments to summing to `income`
// (context) / `staticNew` (new) within 1e-6, and these dollar figures are much
// larger in magnitude than the old percentage-point fields that warranted
// .toFixed(3) truncation, so passing the raw float through is both simpler and
// exact.
export function buildDistSpec(dist, view) {
  var segs = view === 'new' ? NEW_SEGMENTS : CONTEXT_SEGMENTS;
  var groups = Object.keys(dist);

  var rows = [];
  groups.forEach(function (g) {
    var row = dist[g], facet = facetForGroup(g);
    segs.forEach(function (s) {
      rows.push({ group: g, segment: s.key, value: row[s.key] || 0, facet: facet });
    });
  });

  var seriesColors = {}, seriesLabels = {}, seriesPatterns = {};
  segs.forEach(function (s) {
    seriesColors[s.key] = s.color;
    seriesLabels[s.key] = s.label;
    if (s.pattern) seriesPatterns[s.key] = s.pattern;
  });

  // CONTEXT_SEGMENTS/NEW_SEGMENTS are declared bottom-of-stack first, which is the
  // visual order — pinned here via barStack.stackOrder AND handed to series_order,
  // so the legend runs in the same direction as the stack is built rather than
  // against it. Reversing only the legend is safe: stackOrder pins the drawing
  // independently, and the engine's own tooltip (which series_order would also
  // order) is replaced by hooks.tooltip, which orders its own rows.
  var visualOrder = segs.map(function (s) { return s.key; });

  var meta = VIEW_META[view] || VIEW_META.context;

  var spec = {
    chartType: 'stacked',
    title: meta.title,
    subtitle: meta.subtitle,
    xAxisType: 'categorical',
    columns: { x: 'group', series: 'segment', value: 'value', facet: 'facet' },
    series_order: visualOrder,
    series_labels: seriesLabels,
    series_colors: seriesColors,
    series_patterns: seriesPatterns,
    x_order: groups,
    note: CONTEXT_NEW_IDENTITY,
    y_axis_title: 'Dollars, billions',
    // value_prefix/value_suffix reach axis ticks, value labels and tooltips alike.
    value_prefix: '$',
    tooltip_decimals: 1,
    // netDisplay 'none': no net callout at all. This card used to pin 'dot', because
    // the dot is what buys the floating tooltip (CONFIG-SPEC: "when the net dot is
    // shown, hovering a category shows the floating tooltip") — and then hid the dot in
    // CSS, which reached the screen but NOT the PNG export, since the export re-renders
    // from this spec. So every downloaded image carried a net dot and a "Total" legend
    // row the page did not show. Now that the tool draws its own hover card
    // (distTipCfg), nothing needs the dot, and screen and export agree. Filed as
    // engine#29; assume it does not land.
    // hover 'tooltip' (engine 1.12.0) buys the floating card WITHOUT a net callout —
    // the split this card spent two versions working around. netDisplay stays 'none', so
    // no dot reaches the PNG export. Without hover:'tooltip' an all-positive stack hovers
    // with per-segment pills and draws no card, and hooks.tooltip would have nothing to
    // replace (CONFIG-SPEC's hover-card reach table).
    barStack: {
      netDisplay: 'none',
      hover: 'tooltip',
      stackOrder: visualOrder,
      segmentGap: SEGMENT_GAP_PX
    },
    // The card lists every segment, so the pills on the marks would say it twice. A spec
    // switch, not a stylesheet rule: the export re-renders from the spec and never sees CSS.
    chrome: { valuePills: false },
    small_multiples: {
      columns: 2,
      pane_order: FACET_ORDER,
      pane_titles: FACET_TITLES
    }
  };

  return { spec: spec, rows: rows };
}

// ---- rate dumbbell (engine chartType:'dumbbell') ---------------------------

// series/measure order + marker treatment mirrors the engine-request spec's
// example verbatim: current_law ink (neutral), static hollow, collected filled
// — static and collected share ONE accent hue (only fill differs) so the
// reader's eye ties them together as "the plan's ask" vs. "what it collects",
// with current-law as a separate neutral baseline.
// ONE label per concept, used by the legend AND by the hover card. They drifted
// apart once already — the legend read "First-order rate (before behavior)" and
// the card "First-order rate, before behavior", the same series named two ways,
// differing by a parenthesis. The word "rate" is dropped from all three: the
// card's head says "Effective tax rate", the legend sits under an axis titled
// "Effective tax rate, percent of income", and every value carries a % — so
// repeating it on each row was three words saying what the reader already knew.
export var MEASURE_LABELS = {
  current_law: 'Current law',
  static: 'First-order',
  collected: 'Collected'
};
export var DUMBBELL_MEASURES = [
  { key: 'current_law', label: MEASURE_LABELS.current_law, marker: 'ink', field: 'rateCurrentLaw' },
  { key: 'static', label: MEASURE_LABELS.static, marker: 'hollow', field: 'rateStatic' },
  { key: 'collected', label: MEASURE_LABELS.collected, marker: 'filled', field: 'rateCollected' }
];
var DUMBBELL_INK = 'navy';
var DUMBBELL_ACCENT = 'blue';

// Pure: dist -> tidy long rows {group, measure, rate, facet}, per the
// dumbbell-chart-type.md data shape (group/measure/rate), across BOTH facets —
// mountDumbbell below splits them into panes; buildDistSpec's engine rows use
// the identical facetForGroup so the two views partition groups identically.
export function buildDumbbellRows(dist) {
  var rows = [];
  Object.keys(dist).forEach(function (g) {
    var row = dist[g], facet = facetForGroup(g);
    DUMBBELL_MEASURES.forEach(function (m) {
      rows.push({ group: g, measure: m.key, rate: row[m.field], facet: facet });
    });
  });
  return rows;
}

// Legend "identity" note (Task 20): a one-line arithmetic identity tying the
// dollar views' swatches together, restoring paintDist's mono caption line
// (scratchpad/handoff/simulator.html:1239) minus the prototype's own colors/mono
// font — plain muted body text instead. The identity is collectedNew +
// lostToBehavior = staticNew, which model.js holds by construction and
// test/model.test.mjs pins to 1e-6 — it does not depend on the sign of the
// second term, so the neutral form is exactly as true as the original and no
// weaker. The rate view's caption (simulator.html:1229) was removed 2026-10-02.
var CONTEXT_NEW_IDENTITY = '“First-order estimate” = new taxes actually collected '
  + 'plus taxes lost to behavior';
// The identity rides on the spec's own `note` field, NOT on a DOM injection.
// The engine renders it into .figure-note inside the .figure-meta block that
// already carries this figure's download controls — the standard note slot,
// directly under the plot — and, because the PNG export re-renders from the
// spec, its SVG export draws the same line. Injected into the DOM after the
// mount, as it was, it sat below the whole figure AND was absent from every
// downloaded image: the export trap this repo's invariants name three times.

// Pure: dist -> {spec, rows} for the engine's chartType:'dumbbell'. Vertical
// orientation (groups along x, rates up the value axis) faceted into the same two
// panes as the dollar views. The value axis deliberately does NOT force a zero
// baseline — a 2%-35% rate view keeps its useful range, which is the engine's own
// documented dumbbell behavior.
//
// Adopted in engine 1.11.0. This view was hand-rolled SVG only because
// `chartType: dumbbell` landed in 1.7.0, after the 1.4.1 pin it was built against;
// the hand-rolled legend borrowed the engine's own `.tbl-legend-swatch.is-dot`
// class, which 1.11.0 retired when it moved every key to SVG, so the dots silently
// became squares. Nothing here draws marks any more.
export function buildRateSpec(dist) {
  var seriesMarker = {}, seriesLabels = {}, seriesColors = {};
  DUMBBELL_MEASURES.forEach(function (m) {
    seriesMarker[m.key] = m.marker;
    seriesLabels[m.key] = m.label;
    seriesColors[m.key] = m.marker === 'ink' ? DUMBBELL_INK : DUMBBELL_ACCENT;
  });

  var spec = {
    chartType: 'dumbbell',
    orientation: 'vertical',
    xAxisType: 'categorical',
    title: VIEW_META.rate.title,
    subtitle: VIEW_META.rate.subtitle,
    columns: { category: 'group', series: 'measure', value: 'rate', facet: 'facet' },
    category_order: Object.keys(dist),
    series_order: DUMBBELL_MEASURES.map(function (m) { return m.key; }),
    series_labels: seriesLabels,
    series_colors: seriesColors,
    // static reads hollow, collected filled, current law neutral ink: the pair that
    // shares one hue is the plan's ask vs. what it collects, so the eye ties them
    // together and the gap between them is the figure's subject.
    series_marker: seriesMarker,
    value_axis_title: 'Effective tax rate, percent of income',
    value_format: { decimals: 1, suffix: '%' },
    value_suffix: '%',
    // As on the dollar views: the card carries the numbers, so the coordinated cursor's
    // per-series pills would repeat them on every pane.
    chrome: { valuePills: false },
    small_multiples: {
      columns: 2,
      pane_order: FACET_ORDER,
      pane_titles: FACET_TITLES
    }
  };

  return { spec: spec, rows: buildDumbbellRows(dist) };
}

// Swatch colours for the hover card. These are CSS colours, not the palette NAMES the
// spec carries, because the card is our own markup — and `current_law` takes the
// engine's ink token rather than navy, since `series_marker: ink` paints the engine's
// ink, not the series colour.
var CARD_INK = 'var(--tbl-text-heading)';
var CARD_ACCENT = 'var(--tbl-blue)';

// The rate view's hover card: the pp change as the hero, the three rates as rows
// keyed to their own markers, and the denominator spelled out. Kept from the
// hand-rolled version — the engine's own dumbbell tooltip lists series values, which
// is the least of what this figure has to say. Pure, so the wording is testable
// without a DOM.
// The behavioral gap as a printed value. The 0.05 pp threshold is the printing
// precision again (rates print at one decimal): below it the card claims no
// direction at all, in either sign, and prints a plain 0.0.
//
// Sign convention is the DOLLAR views' convention, deliberately: gap is
// first-order minus collected, so a bare number reads "this much of the increase
// is not collected" and a negative one "behavior collects more than the
// first-order estimate" — the same meaning lostToBehavior carries on the dollar
// card, printed the same way by usd(). One convention across all three views, so
// a reader moving between them does not have to relearn which way is which.
// No explicit "+": the ordinary case is a loss, and marking it would put a sign
// on every card to disambiguate a state most readers never reach.
function gapLabel(gap) {
  if (gap == null) return '—';
  if (dirAtPrecision(gap, 1) === 0) return '0.0 pp';
  return (gap < 0 ? '−' : '') + Math.abs(gap).toFixed(1) + ' pp';
}

export function rateTipCfg(group, byMeasure, incomeDef, etrYear, swatches) {
  var vb = byMeasure.current_law, vs = byMeasure.static, vc = byMeasure.collected;
  var gap = (typeof vs === 'number' && typeof vc === 'number') ? vs - vc : null;
  var rate = function (v) { return typeof v === 'number' ? v.toFixed(1) + '%' : '—'; };
  var change = (typeof vc === 'number' && typeof vb === 'number') ? vc - vb : null;
  var basis = incomeDef === 'hs' ? 'accrual income' : 'cash income';
  // Direction from the pp change as printed (one decimal): a change that rounds to
  // 0.0 pp gets no caret rather than one pointing at nothing.
  var dir = change == null ? 0 : dirAtPrecision(change, 1);
  return {
    head: group + ' · Effective tax rate',
    meta: etrYear + ' · ' + basis,
    glyph: dir === 0 ? '' : (dir < 0 ? '▾' : '▴'),
    glyphColor: dir < 0 ? 'var(--tbl-red-400)' : 'var(--tbl-green-400)',
    amount: change == null ? '—'
      : (change >= 0 ? '+' : '−') + Math.abs(change).toFixed(1) + ' pp',
    sub: 'collected, vs. current law',
    // The engine keys these as circles, the middle one as a hollow ring. Hand-drawn
    // swatches are the fallback: a CSS box renders every one of them as a square.
    rows: [
      { swatch: swatches && swatches.current_law, color: CARD_INK, label: MEASURE_LABELS.current_law, value: rate(vb) },
      { swatch: swatches && swatches.static, color: CARD_ACCENT, label: MEASURE_LABELS.static, value: rate(vs), hollow: true },
      { swatch: swatches && swatches.collected, color: CARD_ACCENT, label: MEASURE_LABELS.collected, value: rate(vc) },
      // The behavioral gap as a SIGNED number rather than a sentence. It used to
      // be prose under the rows restating arithmetic the rows already showed
      // ("1.2 pp of the first-order increase is not collected") — and prose has
      // to decide, in words, which direction it is describing. A signed value
      // cannot get that wrong: behavior collecting MORE than the first-order
      // estimate simply prints a negative, which is what the dollar views'
      // card already does with the same quantity.
      { summary: true, label: LABEL_LOST, value: gapLabel(gap) }
    ],
    // The gap's sign is known per group here, so this one branches directly
    // rather than on the figure-wide flag. It used to guard only the MAGNITUDE,
    // which rendered "−0.3 pp of the first-order increase is not collected" for
    // any group where behavior collects MORE than the first-order estimate — a
    // sentence whose words and whose number say opposite things.
    // What survives as a closing sentence: the denominator, which no number in
    // the card states and the caption only alludes to. The gap sentence that
    // used to follow it is now the signed row above.
    // The two bases no longer share a prefix: the accrual variant also
    // enumerates the taxes in the numerator, because "total tax" over a
    // Haig-Simons denominator is the less familiar of the two and the reviewers
    // asked for the numerator spelled out there.
    note: incomeDef === 'hs'
      ? 'Total tax paid by this group divided by its accrual (i.e., Haig-Simons) income, '
        + 'which measures gains as they accrue. Includes federal income tax (including tax '
        + 'on gains at death), payroll, corporate, estate, and wealth taxes.'
      : 'Total federal tax paid by this group divided by its cash income.'
  };
}

// The dollar views' hover card. Leads with the group's total — the number the engine's
// own card appended last and this card reordered in CSS — then the segments in reading
// order. The engine's card would list the four series and nothing else; the identity
// these segments satisfy is the point of the view, so it is stated outright.
export function distTipCfg(group, row, view, incomeDef, etrYear, swatches) {
  var segs = view === 'new' ? NEW_SEGMENTS : CONTEXT_SEGMENTS;
  var basis = incomeDef === 'hs' ? 'accrual income' : 'cash income';
  // BOTH dollar views lead with the first-order estimate, the context view
  // included. Its segments still partition the group's total income — that is
  // what the bar is — but the total income is the denominator of the figure, not
  // its subject, and leading with it made the card's biggest number the least
  // interesting one. The rows below still carry income, so nothing is lost.
  return {
    head: group + ' · ' + (view === 'new' ? 'New taxes' : 'Income and taxes'),
    meta: etrYear + ' · ' + basis,
    amount: usd(row.staticNew),
    sub: 'first-order estimate',
    // Reversed: the card reads top-down the way the stack does, matching series_order.
    rows: segs.slice().reverse().map(function (seg) {
      return {
        // The engine's own key when we have it — it carries the hatch glyph, which a flat
        // colour cannot. SWATCH_CSS is the fallback for a card built without a render.
        swatch: swatches && swatches[seg.key],
        color: SWATCH_CSS[seg.color] || 'var(--tbl-text-muted)',
        label: seg.label,
        // usd() carries the sign (U+2212). Printing the magnitude instead would
        // hide the sign convention and break the card's own arithmetic: the
        // reader has to be able to see $66B + (−$45B) = $21B.
        value: usd(row[seg.key] || 0)
      };
    }),
    // No closing sentence. It used to restate the identity — which the rows
    // above already show, and which the spec's own `note` prints under this very
    // figure, so the reader met it twice within one glance.
  };
}

// Thousands separators on the value axis, via the engine's `tickLabel` hook (1.12.0).
// The engine's own formatter is `d.toFixed(maxFrac)` + affixes with no grouping, and its
// `thousands` flag is a table FormatRule, so the context view's axis would read "$15000".
//
// The hook replaces a tick's text outright, so this reproduces the engine's own format —
// `maxFrac` derived from the tick set the same way makeTickFormatter derives it, then the
// affixes from ctx — and groups the integer part. It is guaranteed to fire identically in
// the PNG export, which is what the previous MutationObserver over rendered tick text
// could never be.
export function groupThousands(label) {
  return String(label).replace(/\d{4,}/g, function (digits) {
    return digits.replace(/\B(?=(\d{3})+$)/g, ',');
  });
}

export function tickLabelHook(value, ctx) {
  if (!Number.isFinite(value)) return null;
  var maxFrac = (ctx.ticks || []).reduce(function (max, t) {
    if (!Number.isFinite(t)) return max;
    var str = String(t), dot = str.indexOf('.');
    return Math.max(max, dot < 0 ? 0 : str.length - dot - 1);
  }, 0);
  var affixes = ctx.affixes || {};
  var body = groupThousands(Math.abs(value).toFixed(maxFrac));
  // The prefix sits INSIDE the minus, matching the engine's own applyValueAffixes: -$5,000.
  return (value < 0 ? '-' : '') + (affixes.prefix || '') + body + (affixes.suffix || '');
}

// The hover card. `hooks.tooltip` hands us the resolved category and lets the engine keep
// hit-testing, positioning and the band highlight — retiring the hand-rolled hit-test that
// re-derived category centres from `data-category` marks. Screen-only by design: a static
// PNG has no hover state, so there is nothing for its content to match.
//
// Reach is the thing to check on a repin, not assume. Both figures are two-pane small
// multiples with the coordinated cursor on, and a coordinated pane normally builds NO
// card — which would remove every view's hover content silently. Verified against 1.12.0
// by mounting all three real specs in jsdom with the engine's own mockRect1to1 harness:
// the hook fires once per hover with the category resolved, on the stacked views (because
// barStack.hover is 'tooltip') and on the faceted dumbbell. See CONFIG-SPEC's reach table
// and the engine's test/hover-card-reach.test.ts.
function tooltipHookFor(cfgForCategory) {
  return function (ctx) {
    if (!ctx || !ctx.category) return null;
    var cfg = cfgForCategory(ctx.category, engineSwatches(ctx.rendered, ctx.series));
    return cfg ? tipCard(cfg) : null;   // null = the engine's own card
  };
}

export function mountDumbbell(el, dist, incomeDef, etrYear) {
  if (!el) return undefined;
  var engine = window.BudgetLabChart;
  if (!engine) throw new Error('Chart engine bundle not loaded (window.BudgetLabChart missing).');
  var built = buildRateSpec(dist);
  var byGroup = {};
  Object.keys(dist).forEach(function (g) {
    var m = {};
    DUMBBELL_MEASURES.forEach(function (d) { m[d.key] = dist[g][d.field]; });
    byGroup[g] = m;
  });
  var teardown = engine.mountChart(el, {
    spec: built.spec,
    rows: built.rows,
    hooks: {
      tickLabel: tickLabelHook,
      tooltip: tooltipHookFor(function (cat, keys) {
        return byGroup[cat] ? rateTipCfg(cat, byGroup[cat], incomeDef, etrYear, keys) : null;
      })
    }
  });
  teardowns.set(el, teardown);
  return teardown;
}

// ---- dispatch ----------------------------------------------------------------
// mountChart appends its card into `el` rather than replacing prior content
// (engine/render-live.ts), so a re-render needs its previous teardown called
// and the container cleared first — one teardown per mount target. All three
// views are engine-mounted now (the rate view since the dumbbell moved onto
// chartType: dumbbell), so every one of them stores a teardown here.
var teardowns = new WeakMap();

export function mountDistribution(el, dist, view, incomeDef, etrYear) {
  var prev = teardowns.get(el);
  if (typeof prev === 'function') prev();
  teardowns.delete(el);
  el.innerHTML = '';

  // Computed once, before anything is drawn, and recorded for the surfaces
  // app.js paints straight after this call — the single flag every string below
  // reads. Set on the rate path too, so a later distHeader
  // cannot read a stale flag left by whichever view was on screen before.

  if (view === 'rate') {
    return mountDumbbell(el, dist, incomeDef, etrYear);
  }

  var engine = window.BudgetLabChart;
  if (!engine) throw new Error('Chart engine bundle not loaded (window.BudgetLabChart missing).');
  var built = buildDistSpec(dist, view);
  // Reachable in practice: the 'new' view before any lever moves off current law.
  // This began as a workaround for an engine bug (an all-zero stack painted
  // full-height bars off a collapsed [0,0] domain), fixed in engine 1.7.0 and
  // verified against 1.11.0 — bars now render at height 0. It stays as an editorial
  // choice: an empty chart frame with a flat zero line says less to a reader than a
  // sentence telling them to turn a policy on.
  if (built.rows.every(function (r) { return Math.abs(r.value) < 1e-9; })) {
    el.innerHTML = '<p class="dist-empty">No new taxes yet — turn on a policy or move a dial to see its effect.</p>';
    return undefined;
  }
  var teardown = engine.mountChart(el, {
    spec: built.spec,
    rows: built.rows,
    hooks: {
      tickLabel: tickLabelHook,
      tooltip: tooltipHookFor(function (cat, keys) {
        return dist[cat] ? distTipCfg(cat, dist[cat], view, incomeDef, etrYear, keys) : null;
      })
    }
  });
  teardowns.set(el, teardown);
  // mountChart appends its own figure (chart + engine legend) into `el`. The
  // identity note is NOT appended here — it rides on the spec's `note` field, so
  // the engine puts it in its own note slot and the PNG export carries it too.
  return teardown;
}
