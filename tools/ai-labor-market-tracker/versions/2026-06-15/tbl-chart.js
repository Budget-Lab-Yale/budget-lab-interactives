/* ===========================================================================
 * tbl-chart.js — Shared Budget Lab chart helpers.
 *
 * Built on Observable Plot + D3. The chart constructors in charts.js
 * compose these helpers.
 *
 * Style references: Style-Guide/chart-types/_common.md and line.md.
 *   - y-axis labels sit ABOVE each gridline (FT/Economist convention),
 *     left-anchored at the chart's left edge → align with title.
 *   - No axis spines, no tick marks.
 *   - Gridlines #F0F0F0; zero baseline emphasized at #999 1px when present.
 *   - Legend at the top with hover-to-dim other series.
 *   - Crosshair tooltip follows the cursor (position: fixed).
 * =========================================================================== */

import * as Plot from "https://esm.sh/@observablehq/plot@0.6.16";
import * as d3 from "https://esm.sh/d3@7.9.0";

export { Plot, d3 };

// --- Palette --------------------------------------------------------------

const TBL_PALETTE = [
  "#0072B2", // cat1 blue
  "#E69F00", // cat2 amber
  "#8856BF", // cat3 violet
  "#2A8B3A", // cat4 green
  "#B8302C", // cat5 red
  "#CC79A7", // cat6 rose
  "#7A5230", // cat7 russet
];

// Light tier for chart slots 8-14: each entry is two tonal steps lighter
// than its base cat's own position in the scale. The cats sit at
// different tiers (blue/violet/red at -400, amber/rose at -200, green
// at -300, russet at -500), so a flat "-200 for everything" rule gives
// inconsistent gaps from base — amber-200 ends up nearly identical to
// the amber cat. Stepping relative to each cat's tier yields a more
// uniform visual distance.
//   cat tier → +2 lighter
//   blue-400   → blue-200
//   amber-200  → amber-50
//   violet-400 → violet-200
//   green-300  → green-100
//   red-400    → red-200
//   rose-200   → rose-50
//   russet-500 → russet-300
const TBL_PALETTE_LIGHT = [
  "#58A3E7", // blue-200
  "#FFC63D", // amber-50
  "#BC85F4", // violet-200
  "#70CD76", // green-100
  "#FF7062", // red-200
  "#FFBAE9", // rose-50
  "#A77A56", // russet-300
];

export function tblColorScale(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (i < TBL_PALETTE.length) {
      out.push(TBL_PALETTE[i]);
    } else {
      // Slot 8+: light tier of same hue as the corresponding base.
      out.push(TBL_PALETTE_LIGHT[(i - TBL_PALETTE.length) % TBL_PALETTE_LIGHT.length]);
    }
  }
  return out;
}

// --- Theme tokens ---------------------------------------------------------

export const TBL = {
  // Figtree is the tracker's typeface; the rest are load-failure fallbacks.
  font: 'Figtree, "Source Sans 3", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  color: {
    text: "#4A4A4A",
    heading: "#1A1A2E",
    muted: "#6D6D6D",
    axis: "#666666",
    gridline: "#F0F0F0",
    axisStroke: "#999999",
    annotationDim: "#BBBBBB",
    bgSubtle: "#F6F7F9",
    border: "#E5E5E5",
    navy: "#101F5B",
    blue: "#0072B2",
  },
  size: {
    axis: 10.5,    // tick labels
    legend: 12,
    annotation: 11,
  },
  strokeWidth: { solid: 2, dashed: 2 },
  dashArray: "5 3",
};

// Named colors for config authors. A `series_colors` value or a selector
// option's `color` may be a name (e.g. "blue", "amber-light", "black") or a
// raw "#hex". Names keep the configs readable and tied to the palette.
export const TBL_COLORS = {
  blue: TBL_PALETTE[0], amber: TBL_PALETTE[1], violet: TBL_PALETTE[2],
  green: TBL_PALETTE[3], red: TBL_PALETTE[4], rose: TBL_PALETTE[5], russet: TBL_PALETTE[6],
  "blue-light": TBL_PALETTE_LIGHT[0], "amber-light": TBL_PALETTE_LIGHT[1],
  "violet-light": TBL_PALETTE_LIGHT[2], "green-light": TBL_PALETTE_LIGHT[3],
  "red-light": TBL_PALETTE_LIGHT[4], "rose-light": TBL_PALETTE_LIGHT[5],
  "russet-light": TBL_PALETTE_LIGHT[6],
  black: "#000000", grey: TBL.color.muted, gray: TBL.color.muted, navy: TBL.color.navy,
};

// Resolve a config color value: a known name → its hex; anything else
// (already a "#hex", or unrecognized) is returned unchanged.
export function resolveColor(value) {
  if (!value) return value;
  return TBL_COLORS[value] || value;
}

// --- Plot defaults --------------------------------------------------------
// marginLeft holds a "label column" on the left: y-tick labels sit at
// svg x=0 (sharing the left edge with title/subtitle/note/source above),
// and the data plot area starts at x=marginLeft, well to the right of
// where labels end.

export const TBL_MARGIN_LEFT = 44;
// Right label column: reserves room for the rightmost x-axis tick label so
// it isn't clipped. Gridlines/zero-baseline extend across it (insetRight) so
// the chart's right edge stays flush with the canvas — symmetric with the
// flush-left y-axis labels.
export const TBL_MARGIN_RIGHT = 16;

export function tblPlotDefaults({
  height = 320,
  marginLeft = TBL_MARGIN_LEFT,
  marginRight = TBL_MARGIN_RIGHT,
  marginTop = 18,
  // marginBottom only needs to fit the tick labels (caller overrides per
  // chart type: ~22 for single-line ticks, ~38 for two-line month/year).
  marginBottom = 24,
} = {}) {
  return {
    height,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    style: {
      background: "transparent",
      color: TBL.color.text,
      fontFamily: TBL.font,
      fontSize: `${TBL.size.axis}px`,
      overflow: "visible",
    },
    x: { label: null, axis: null },
    y: { label: null, axis: null, grid: false },
  };
}

// Compute a "nice" y-domain + tick array up front so we can render
// gridlines and labels as explicit marks with full positioning control.

export function computeYAxis(yValues, {
  includeZero = false,
  tickCount = 5,
  // Hard override: when provided, ignore yValues entirely and return this
  // exact domain with ticks computed against it. Used to lock the y-axis
  // for a tab or figure family (e.g. AI Metrics at 0-80, Top Industries
  // at 0-16) regardless of the active series' range.
  domain = null,
} = {}) {
  if (domain) {
    const scale = d3.scaleLinear().domain(domain).nice(tickCount);
    return { domain: scale.domain(), ticks: scale.ticks(tickCount) };
  }
  const nums = yValues.map(v => +v).filter(Number.isFinite);
  if (!nums.length) return { domain: [0, 1], ticks: [0, 1] };
  let [lo, hi] = d3.extent(nums);
  if (includeZero) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
  const scale = d3.scaleLinear().domain([lo, hi]).nice(tickCount);
  return { domain: scale.domain(), ticks: scale.ticks(tickCount) };
}

// Gridlines (Plot.ruleY) + y-tick labels positioned in the left margin
// at svg x=0, above each gridline (FT/Economist convention).
//
// `marginLeft` MUST match the plot's marginLeft so dx pushes labels back
// to the SVG's left edge. `insetLeft: -marginLeft` + `clip: false`
// extends gridlines leftward through the label margin to the SVG's
// left edge — so the gridlines pass under each label rather than
// stopping at the plot area edge.

export function gridAndYLabels(yTicks, {
  yTickFormat = d => String(d),
  marginLeft = TBL_MARGIN_LEFT,
  marginRight = TBL_MARGIN_RIGHT,
} = {}) {
  // Skip y=0 from the light gridlines — renderLine paints a darker zero
  // baseline on top of it, and stacking two 1px rules at the same y
  // produces a slightly fuzzy/thicker line. The "0" label still
  // renders below (Plot.text covers every tick).
  const gridlineTicks = yTicks.filter(t => t !== 0);
  return [
    Plot.ruleY(gridlineTicks, {
      stroke: TBL.color.gridline,
      strokeWidth: 1,
      insetLeft: -marginLeft,
      insetRight: -marginRight,
      clip: false,
    }),
    // className tags the wrapping <g> so the renderer can find these
    // labels post-render and replace them with a sticky HTML overlay
    // that stays visible when the chart scrolls horizontally.
    Plot.text(yTicks, {
      y: d => d,
      text: yTickFormat,
      frameAnchor: "left",
      dx: -marginLeft,
      dy: -6,
      textAnchor: "start",
      fill: TBL.color.axis,
      fontSize: TBL.size.axis,
      fontWeight: 500,      className: "tbl-y-tick-label",
    }),
  ];
}

// Build a tick formatter that picks the minimum precision needed across
// the whole tick array — no ".0" when every tick is an integer; one
// decimal when ticks step by 0.5; etc.
export function makeTickFormatter(ticks, units = "") {
  const maxFrac = ticks.reduce((max, t) => {
    if (!Number.isFinite(t)) return max;
    const s = String(t);
    const i = s.indexOf(".");
    return Math.max(max, i < 0 ? 0 : s.length - i - 1);
  }, 0);
  return d => {
    if (!Number.isFinite(d)) return "";
    const s = d.toFixed(maxFrac);
    return units ? `${s}${units}` : s;
  };
}


// X-axis tick labels: left-anchored at each tick position, sitting just
// below the bottom gridline (Style Guide convention).

export function tblXAxis({ xTickFormat } = {}) {
  return [
    Plot.axisX({
      anchor: "bottom",
      textAnchor: "middle",
      tickSize: 0,
      dy: 4,
      fontSize: TBL.size.axis,
      fill: TBL.color.axis,
      fontWeight: 500,      tickFormat: xTickFormat,
    }),
  ];
}

// Two-line temporal x-axis: month name on top, year on bottom (only on
// January ticks, so years aren't repeated). Tick cadence auto-picks based
// on the data span — quarterly for short spans, semi-annual / yearly /
// every-N-years for longer ones.

function pickTemporalCadence(xDomain) {
  const months = (xDomain[1] - xDomain[0]) / (30.44 * 24 * 3600 * 1000);
  // Aim for roughly 8-12 ticks across the chart.
  if (months <=  36) return 3;     // quarterly
  if (months <=  72) return 6;     // semi-annual
  if (months <= 144) return 12;    // yearly
  if (months <= 288) return 24;    // every 2 years
  if (months <= 600) return 60;    // every 5 years
  return 120;                      // every 10 years
}

export function temporalXTicks(xDomain) {
  const cadence = pickTemporalCadence(xDomain);
  const [start, end] = xDomain;

  if (cadence < 12) {
    // Sub-yearly cadence: snap ticks to Jan/Apr/Jul/Oct (or month boundary).
    const startSnap = d3.timeMonth.floor(start);
    const ticks = [];
    let t = startSnap;
    // Align first tick to a multiple of `cadence` months from January.
    const monthOffset = t.getMonth() % cadence;
    if (monthOffset !== 0) t = d3.timeMonth.offset(t, cadence - monthOffset);
    while (t <= end) {
      if (t >= start) ticks.push(new Date(t));
      t = d3.timeMonth.offset(t, cadence);
    }
    return ticks;
  }

  // Yearly+ cadence: ticks at January of each Nth year.
  const years = cadence / 12;
  const startYear = Math.ceil(start.getFullYear() / years) * years;
  const ticks = [];
  for (let y = startYear; new Date(y, 0, 1) <= end; y += years) {
    const t = new Date(y, 0, 1);
    if (t >= start) ticks.push(t);
  }
  return ticks;
}

export function tblTemporalXAxis(xDomain) {
  const ticks = temporalXTicks(xDomain);
  const yearTicks = ticks.filter(d => d.getMonth() === 0);
  // When every tick lands on January (yearly+ cadence), the "Jan" line is
  // redundant — render just the year at the standard top-line position so
  // the axis hugs the chart instead of leaving an empty band.
  const allJanuary = ticks.length > 0 && yearTicks.length === ticks.length;

  if (allJanuary) {
    return [
      Plot.text(ticks, {
        x: d => d,
        text: d => d3.timeFormat("%Y")(d),
        frameAnchor: "bottom",
        dy: 12,
        textAnchor: "middle",
        dx: 0,
        fill: TBL.color.axis,
        fontSize: TBL.size.axis,
        fontWeight: 500,      }),
    ];
  }

  return [
    // Month name (top line)
    Plot.text(ticks, {
      x: d => d,
      text: d => d3.timeFormat("%b")(d),
      frameAnchor: "bottom",
      dy: 12,
      textAnchor: "middle",
      dx: 0,
      fill: TBL.color.axis,
      fontSize: TBL.size.axis,
      fontWeight: 500,    }),
    // Year (bottom line, January only) — center-aligned under the month
    Plot.text(yearTicks, {
      x: d => d,
      text: d => d3.timeFormat("%Y")(d),
      frameAnchor: "bottom",
      dy: 24,
      textAnchor: "middle",
      dx: 0,
      fill: TBL.color.axis,
      fontSize: TBL.size.axis,
      fontWeight: 500,    }),
  ];
}

// --- renderPlot: responsive wrapper ---------------------------------------

export function makeResponsive(svg) {
  const w = +svg.getAttribute("width")  || 720;
  const h = +svg.getAttribute("height") || 320;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%");
  svg.removeAttribute("height");
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  return svg;
}

export function renderPlot(container, plotOptions, { margins } = {}) {
  const svg = Plot.plot(plotOptions);
  const m = margins ?? {};
  svg.dataset.marginLeft   = m.left   ?? plotOptions.marginLeft   ?? 0;
  svg.dataset.marginRight  = m.right  ?? plotOptions.marginRight  ?? 8;
  svg.dataset.marginTop    = m.top    ?? plotOptions.marginTop    ?? 18;
  svg.dataset.marginBottom = m.bottom ?? plotOptions.marginBottom ?? 28;
  makeResponsive(svg);
  container.replaceChildren(svg);
  return svg;
}

// --- Legend + hover-to-dim ------------------------------------------------
// renderLine in charts.js tags each <path data-series="…"> on the SVG
// inline by series-encounter order across line groups; this file only
// owns the legend's hover-dim plumbing here.

export function renderLegend(parent, items, { svg } = {}) {
  if (!items?.length) return null;

  const legend = document.createElement("div");
  legend.className = "tbl-legend";

  const allSeries = items.map(i => i.series);
  const pinned = new Set();
  let hovered = null;

  const applyHighlight = () => {
    const active = new Set(pinned);
    if (hovered) active.add(hovered);
    // Dim only when a subset is highlighted (not everything, not nothing).
    const dimAll = active.size > 0 && active.size < allSeries.length;
    if (svg) {
      svg.querySelectorAll("path[data-series]").forEach(p => {
        const s = p.getAttribute("data-series");
        p.classList.toggle("tbl-dimmed", dimAll && !active.has(s));
      });
    }
    legend.querySelectorAll(".tbl-legend-item").forEach(btn => {
      btn.classList.toggle("is-pinned", pinned.has(btn.dataset.series));
      btn.setAttribute("aria-pressed", String(pinned.has(btn.dataset.series)));
    });
    resetBtn.hidden = pinned.size === 0;
  };

  for (const { series, label: displayLabel, color, dashed = false } of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tbl-legend-item";
    btn.dataset.series = series;     // data key — matches path[data-series]
    btn.setAttribute("aria-pressed", "false");
    // Series color exposed as a custom property so the pinned-state
    // underline can color-match the corresponding line.
    btn.style.setProperty("--legend-color", color);

    const swatch = document.createElement("span");
    swatch.className = "tbl-legend-swatch";
    if (dashed) {
      swatch.classList.add("is-dashed");
      swatch.style.setProperty("--swatch-color", color);
    } else {
      swatch.style.background = color;
    }

    const label = document.createElement("span");
    label.textContent = displayLabel ?? series;   // optional display name

    btn.appendChild(swatch);
    btn.appendChild(label);

    btn.addEventListener("pointerenter", () => { hovered = series; applyHighlight(); });
    btn.addEventListener("pointerleave", () => { hovered = null;   applyHighlight(); });
    btn.addEventListener("focus",        () => { hovered = series; applyHighlight(); });
    btn.addEventListener("blur",         () => { hovered = null;   applyHighlight(); });
    btn.addEventListener("click", () => {
      if (pinned.has(series)) pinned.delete(series);
      else pinned.add(series);
      applyHighlight();
    });

    legend.appendChild(btn);
  }

  // Circular reset button — placed BEFORE the first legend item so it
  // stays in a stable, visible position regardless of how many lines of
  // items wrap below it. Hidden until something is pinned.
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "tbl-legend-reset";
  resetBtn.setAttribute("aria-label", "Clear pinned highlights");
  // Anticlockwise gapped circle arrow (U+27F2). Wrapped in a span so we
  // can transform it independently to land on the button's optical center
  // (Unicode arrows often render below the line-box midline).
  resetBtn.innerHTML = '<span class="tbl-legend-reset-icon">⟲</span>';
  resetBtn.hidden = true;
  resetBtn.addEventListener("click", () => {
    pinned.clear();
    applyHighlight();
  });
  legend.insertBefore(resetBtn, legend.firstChild);

  parent.appendChild(legend);
  return legend;
}

// --- Source / note line ---------------------------------------------------

export function renderSourceLine(container, { note, source, actions } = {}) {
  if (!note && !source && !actions) return;
  const meta = document.createElement("div");
  meta.className = "figure-meta";

  // Note + source stack in a left text column; the download buttons sit as a
  // fixed column to its right. The text column wraps before the buttons
  // rather than running full-width above them.
  const text = document.createElement("div");
  text.className = "figure-meta-text";
  if (note) {
    const p = document.createElement("p");
    p.className = "figure-note";
    p.textContent = note;
    text.appendChild(p);
  }
  if (source) {
    const p = document.createElement("p");
    p.className = "figure-source";
    const span = document.createElement("span");
    span.className = "figure-source-prefix";
    span.textContent = "Source: ";
    p.appendChild(span);
    p.appendChild(document.createTextNode(source));
    text.appendChild(p);
  }
  meta.appendChild(text);
  if (actions) meta.appendChild(actions);
  container.appendChild(meta);
}

// --- Crosshair / cursor-following tooltip ---------------------------------
// Tooltip is appended to document.body and positioned with position:fixed
// using cursor's viewport coordinates. Vertical guide stays inside the SVG
// and snaps to the nearest x in the data.

let activeTooltip = null;   // single shared tooltip element

function getSharedTooltip() {
  if (activeTooltip && document.body.contains(activeTooltip)) return activeTooltip;
  const tip = document.createElement("div");
  tip.className = "tbl-tooltip";   // see styles.css for visual treatment
  document.body.appendChild(tip);
  activeTooltip = tip;
  return tip;
}

export function attachCrosshair(svgEl, {
  rows,
  xField = "time",
  yField = "value",
  seriesField = "series",
  xParse,
  xFormat,
  yFormat = v => `${(+v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  colors,
  dashedSeries,        // optional Set of series names that render dashed
  seriesLabels,        // optional { dataKey: displayLabel } map
  seriesOrder,         // optional array fixing the tooltip row order (matches the legend)
} = {}) {
  if (!svgEl || !rows?.length) return;

  const vb = svgEl.viewBox?.baseVal;
  const W = vb?.width  || +svgEl.getAttribute("width")  || svgEl.clientWidth;
  const H = vb?.height || +svgEl.getAttribute("height") || svgEl.clientHeight;

  const ml = +svgEl.dataset.marginLeft   || 0;
  const mr = +svgEl.dataset.marginRight  || 8;
  const mt = +svgEl.dataset.marginTop    || 18;
  const mb = +svgEl.dataset.marginBottom || 28;

  const plotW = W - ml - mr;
  const plotH = H - mt - mb;

  if (!xParse) {
    const sample = rows[0][xField];
    if (/^\d{4}-\d{2}-\d{2}/.test(sample)) {
      xParse = v => +new Date(v);
      if (!xFormat) xFormat = v => d3.timeFormat("%b %Y")(new Date(v));
    } else if (/Q\d/.test(String(sample))) {
      xParse = v => {
        const m = /(\d{4})Q(\d)/.exec(v);
        return +new Date(+m[1], (+m[2] - 1) * 3, 1);
      };
      if (!xFormat) xFormat = v => {
        const d = new Date(v);
        const q = Math.floor(d.getMonth() / 3) + 1;
        return `${d.getFullYear()}Q${q}`;
      };
    } else {
      xParse = v => +v;
      if (!xFormat) xFormat = v => String(v);
    }
  }

  const xs = Array.from(new Set(rows.map(r => xParse(r[xField])))).sort((a, b) => a - b);
  const bySeries = new Map();
  for (const r of rows) {
    const v = r[yField];
    if (v === "" || v == null) continue;   // skip blank rows
    const k = r[seriesField];
    if (!bySeries.has(k)) bySeries.set(k, new Map());
    bySeries.get(k).set(xParse(r[xField]), +v);
}
  const xMin = xs[0], xMax = xs[xs.length - 1];
  const xToPx = x => ml + ((x - xMin) / (xMax - xMin)) * plotW;
  const pxToX = px => xMin + ((px - ml) / plotW) * (xMax - xMin);
  const bisect = d3.bisector(d => d).left;

  // Vertical guide line
  const NS = "http://www.w3.org/2000/svg";
  svgEl.querySelectorAll(".tbl-crosshair, .tbl-crosshair-hit").forEach(el => el.remove());

  const guide = document.createElementNS(NS, "line");
  guide.classList.add("tbl-crosshair");
  guide.setAttribute("stroke", TBL.color.annotationDim);
  guide.setAttribute("stroke-dasharray", "3 3");
  guide.setAttribute("y1", mt);
  guide.setAttribute("y2", mt + plotH);
  guide.setAttribute("opacity", "0");
  guide.style.pointerEvents = "none";
  svgEl.appendChild(guide);

  // Transparent hit-area covering the full SVG so events fire over any region
  const hit = document.createElementNS(NS, "rect");
  hit.classList.add("tbl-crosshair-hit");
  hit.setAttribute("x", 0);
  hit.setAttribute("y", 0);
  hit.setAttribute("width", W);
  hit.setAttribute("height", H);
  hit.setAttribute("fill", "transparent");
  hit.style.cursor = "crosshair";
  svgEl.appendChild(hit);

  const tip = getSharedTooltip();

  function snapX(svgX) {
    if (svgX < ml || svgX > ml + plotW) return null;
    const xVal = pxToX(svgX);
    const i = bisect(xs, xVal);
    const cand = [xs[i - 1], xs[i]].filter(v => v != null);
    if (!cand.length) return null;
    return cand.length === 1 ? cand[0]
         : Math.abs(cand[0] - xVal) < Math.abs(cand[1] - xVal) ? cand[0] : cand[1];
  }

  function update(evt) {
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width) return;
    const scaleX = W / rect.width;
    const svgX = (evt.clientX - rect.left) * scaleX;

    const snap = snapX(svgX);
    if (snap == null) { hide(); return; }
    const gx = xToPx(snap);
    guide.setAttribute("x1", gx);
    guide.setAttribute("x2", gx);
    guide.setAttribute("opacity", "1");

    // Build tooltip content. The swatch matches the legend's
    // line-segment style (solid bar or dashed top-border) so the
    // tooltip preview is unambiguous when two series share a color
    // and only the dash pattern distinguishes them (SDID levels).
    let html = `<div class="tbl-tooltip-head">${escapeHtml(xFormat(snap))}</div>`;
    // Tooltip rows follow seriesOrder (the legend's order) when supplied,
    // otherwise fall back to the series' encounter order in the data.
    const tipSeries = (seriesOrder && seriesOrder.length)
      ? seriesOrder.filter(s => bySeries.has(s))
      : [...bySeries.keys()];
    for (const series of tipSeries) {
      const m = bySeries.get(series);
      const v = m.get(snap);
      if (v == null || Number.isNaN(v)) continue;
      const dot = colors?.get(series) || "currentColor";
      const isDashed = dashedSeries?.has(series);
      const display = (seriesLabels && seriesLabels[series]) || series;
      const swatchClass = isDashed ? "tbl-tooltip-swatch is-dashed" : "tbl-tooltip-swatch";
      const swatchStyle = isDashed
        ? `--swatch-color: ${dot}`
        : `background: ${dot}`;
      html += `<div class="tbl-tooltip-row"><span class="${swatchClass}" style="${swatchStyle}"></span><span><span class="tbl-tooltip-label">${escapeHtml(display)}:</span> <span class="tbl-tooltip-value">${escapeHtml(yFormat(v))}</span></span></div>`;
    }
    tip.innerHTML = html;

    // Position fixed at viewport cursor coords (+ a small offset so the
    // tip never sits under the cursor and obstructs hit testing).
    const offset = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // First measure (offsetWidth/Height require display); set opacity early.
    tip.style.opacity = "1";
    let left = evt.clientX + offset;
    let top  = evt.clientY + offset;
    if (left + tip.offsetWidth + 4 > vw) left = evt.clientX - tip.offsetWidth - offset;
    if (top  + tip.offsetHeight + 4 > vh) top  = evt.clientY - tip.offsetHeight - offset;
    if (left < 4) left = 4;
    if (top  < 4) top  = 4;
    tip.style.left = `${left}px`;
    tip.style.top  = `${top}px`;
  }

  function hide() {
    guide.setAttribute("opacity", "0");
    tip.style.opacity = "0";
  }

  hit.style.pointerEvents = "all";
  hit.addEventListener("pointermove", update);
  hit.addEventListener("pointerleave", hide);
  hit.addEventListener("pointerdown",  update);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
