/* ===========================================================================
 * AI Labor Market Tracker — generic chart dispatcher.
 *
 * renderFigure iterates figure.charts (1+ chart blocks per figure) and
 * renders each one as a supertitle / card / source-line block via
 * renderLine. Everything that controls chart construction lives in the
 * manifest's chart config — no per-tab branches, no figure-number math.
 *
 * Chart config shape (see data/CONFIG-REFERENCE.md for the full list):
 *   chartType, xAxisType, xAxisPolicy, yAxisPolicy, series_order,
 *   series_styles, series_colors, series_labels, confidence_bands,
 *   selectors, variants, data, title, subtitle, source, note,
 *   x_axis_title.
 * =========================================================================== */

import {
  Plot, d3, TBL, tblColorScale, TBL_MARGIN_LEFT, TBL_MARGIN_RIGHT,
  tblPlotDefaults, gridAndYLabels, tblXAxis, tblTemporalXAxis,
  temporalXTicks,
  computeYAxis, makeTickFormatter, resolveColor,
  renderSourceLine, attachCrosshair, renderLegend,
} from "./tbl-chart.js";

import { exportFigurePng } from "./export-image.js";

// --- Time helpers --------------------------------------------------------

function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(s);
}
function parseQuarter(s) {
  const m = /^(\d{4})Q(\d)$/.exec(s);
  if (!m) return null;
  return new Date(+m[1], (+m[2] - 1) * 3, 1);
}
function formatQuarter(d) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}Q${q}`;
}

// --- Card scaffold -------------------------------------------------------

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function buildCard(parent, { title, subtitle }) {
  const card = document.createElement("div");
  card.className = "figure-card";
  if (title) {
    const h = document.createElement("h3");
    h.className = "figure-title";
    h.textContent = title;
    card.appendChild(h);
  }
  if (subtitle) {
    const s = document.createElement("p");
    s.className = "figure-subtitle";
    s.textContent = subtitle;
    card.appendChild(s);
  }
  const legendSlot = document.createElement("div");
  legendSlot.className = "figure-legend-slot";
  card.appendChild(legendSlot);

  // The canvas itself has a min-width so SVG axis text stays readable
  // on narrow viewports. The scroll wrapper isolates horizontal overflow
  // to the chart region, so the title/subtitle/description above and
  // below it keep wrapping normally to the card width.
  const canvasScroll = document.createElement("div");
  canvasScroll.className = "figure-canvas-scroll";
  card.appendChild(canvasScroll);

  const canvas = document.createElement("div");
  canvas.className = "figure-canvas";
  canvasScroll.appendChild(canvas);

  parent.appendChild(card);
  return { card, canvas, canvasScroll, legendSlot };
}

// Sticky y-axis: the SVG's y-axis labels would scroll off-screen with
// the rest of the SVG when the chart overflows horizontally. We hide
// them post-render and recreate each one as a floating HTML span with
// a semi-transparent pill behind it, then transform the wrapping
// element by scrollLeft so the labels stay visible at the left.
//
// The SVG's gridlines + zero baseline are untouched — they remain
// visible across the full chart at every scroll position, so we get
// frozen-y-axis behavior without rebuilding (and color-matching) any
// SVG primitive in HTML. A ResizeObserver keeps the spans' vertical
// positions aligned with the SVG's tick text on resize.
function attachYAxisOverlay(canvasScroll, svg) {
  const textEls = Array.from(svg.querySelectorAll('g.tbl-y-tick-label text'));
  if (!textEls.length) return null;

  const overlay = document.createElement("div");
  overlay.className = "figure-y-axis-overlay";
  const pairs = textEls.map(textEl => {
    const span = document.createElement("span");
    span.textContent = textEl.textContent;
    overlay.appendChild(span);
    return { textEl, span };
  });
  textEls.forEach(el => { el.style.visibility = "hidden"; });
  canvasScroll.appendChild(overlay);

  const reposition = () => {
    const svgRect = svg.getBoundingClientRect();
    const scrollRect = canvasScroll.getBoundingClientRect();
    if (!svgRect.height) return;
    overlay.style.height = `${svgRect.height}px`;
    for (const { textEl, span } of pairs) {
      const r = textEl.getBoundingClientRect();
      span.style.top = `${r.top - scrollRect.top}px`;
    }
  };
  reposition();
  // Keep the floating labels aligned with the SVG's tick text as fonts
  // load / the box re-lays-out. Stored on the element so the controller can
  // disconnect it when this overlay is replaced on the next re-render.
  const ro = new ResizeObserver(reposition);
  ro.observe(svg);
  overlay._ro = ro;

  // NOTE: the scrollLeft → translateX listener lives on the controller, not
  // here. canvasScroll persists across re-renders, so attaching it here would
  // stack one listener per resize.
  return overlay;
}

// Description is appended at the very bottom of the card (after the
// source/note line). Width is constrained to match the chart canvas so
// the prose lines up with the figure visually rather than spilling to
// the card's outer edges.
function appendDescription(card, description_html) {
  if (!description_html) return;
  const d = document.createElement("div");
  d.className = "figure-description";
  d.innerHTML = description_html;
  card.appendChild(d);
}

function canvasError(canvas, err) {
  console.error(err);
  canvas.innerHTML = `<div class="figure-error">Could not render: ${escapeHtml(err.message)}</div>`;
}

// Supertitle is the eyebrow line above the chart title (e.g. "Occupational
// Churn Figure 4"). Currently hidden — flip to true to bring the figure-number
// eyebrow back. renderSupertitle and the figureNum data are kept intact.
const SHOW_FIGURE_SUPERTITLE = false;

function renderSupertitle(parent, text) {
  const el = document.createElement("div");
  el.className = "figure-supertitle";
  el.textContent = text;
  parent.appendChild(el);
}

// --- Download buttons ----------------------------------------------------

// Tray-with-down-arrow glyph, inlined so the standalone bundle stays
// self-contained (no icon font / external request).
const DOWNLOAD_ICON =
  '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">' +
  '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
  'stroke-linejoin="round" d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10"/></svg>';

// Per-chart download buttons, placed right-aligned on the source line.
// Data is wired to download the chart's full source CSV (all
// variants/industries) as <figureId>.csv. Image is an intentional
// placeholder — the high-res PNG export pipeline is the next phase.
function buildDownloadActions(figure, chart, ctx, rows) {
  const wrap = document.createElement("div");
  wrap.className = "figure-downloads";

  const dataBtn = document.createElement("button");
  dataBtn.type = "button";
  dataBtn.className = "figure-download-btn";
  dataBtn.setAttribute("aria-label", "Download data (CSV)");
  dataBtn.innerHTML = `${DOWNLOAD_ICON}<span>Data</span>`;
  const dataLabel = dataBtn.querySelector("span");
  dataBtn.addEventListener("click", async () => {
    if (!ctx.downloadData || !chart.data) return;
    const original = dataLabel.textContent;
    dataBtn.disabled = true;
    try {
      await ctx.downloadData(chart.data, `${figure.id}.csv`);
    } catch (err) {
      console.error("Data download failed:", err);
      dataLabel.textContent = "Failed";
      setTimeout(() => { dataLabel.textContent = original; }, 2000);
    } finally {
      dataBtn.disabled = false;
    }
  });
  wrap.appendChild(dataBtn);

  const imgBtn = document.createElement("button");
  imgBtn.type = "button";
  imgBtn.className = "figure-download-btn";
  imgBtn.setAttribute("aria-label", "Download image (PNG)");
  imgBtn.innerHTML = `${DOWNLOAD_ICON}<span>Image</span>`;
  const imgLabel = imgBtn.querySelector("span");
  imgBtn.addEventListener("click", async () => {
    const original = imgLabel.textContent;
    imgBtn.disabled = true;
    try {
      await exportFigurePng(chart, rows, ctx);
    } catch (err) {
      console.error("Image export failed:", err);
      imgLabel.textContent = "Failed";
      setTimeout(() => { imgLabel.textContent = original; }, 2000);
    } finally {
      imgBtn.disabled = false;
    }
  });
  wrap.appendChild(imgBtn);

  return wrap;
}

// --- Helpers -------------------------------------------------------------

function uniqueSeries(rows) {
  const seen = new Set(), out = [];
  for (const r of rows) if (!seen.has(r.series)) { seen.add(r.series); out.push(r.series); }
  return out;
}

function buildColorMap(seriesNames, seriesColorsCfg) {
  const palette = tblColorScale(seriesNames.length);
  const m = new Map();
  seriesNames.forEach((s, i) => {
    const override = resolveColor(seriesColorsCfg?.[s]);
    m.set(s, override || palette[i]);
  });
  return m;
}

// Resolved color of the active option of a chart's single-value selector
// (e.g. the by-industry industry picker), or null. Lets a single-line chart
// pick up the selector's color and match the inline-title selector.
export function activeSelectorColor(chart, toggles) {
  for (const sel of (chart.selectors || [])) {
    if (sel.kind === "single") {
      const active = (toggles || {})[sel.id] || sel.default;
      const opt = (sel.options || []).find(o => o.id === active);
      // Explicit option color, else the figure's series color for that
      // option's label (so the selector inherits the shared industry map).
      const c = opt && (opt.color || chart.series_colors?.[opt.label]);
      if (c) return resolveColor(c);
    }
  }
  return null;
}

function formatTooltip(v, units) {
  if (!Number.isFinite(v)) return "—";
  const s = v.toFixed(2);
  return units ? `${s}${units}` : s;
}

function inferUnitsFromSubtitle(subtitle) {
  if (!subtitle) return "";
  const lower = subtitle.toLowerCase();
  if (lower.includes("percent") || lower.includes("percentage point")) return "%";
  return "";
}

function appendXAxisTitle(canvas, axisTitle) {
  if (!axisTitle) return;
  const el = document.createElement("div");
  el.className = "figure-x-axis-title";
  el.textContent = axisTitle;
  // Append to the scroll wrapper (sibling of canvas) so the title can
  // be sized to the visible viewport rather than the wider scrollable
  // canvas. Combined with position: sticky + text-align: center in CSS,
  // this keeps the title centered in the visible area during horizontal
  // scroll.
  (canvas.parentElement || canvas).appendChild(el);
}

// ---------------------------------------------------------------------------
// Inline-title selector (used by Dissim F4's industry dropdown).

function buildInlineSelect(items, activeId, onChange) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "inline-select";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");

  const labelEl = document.createElement("span");
  labelEl.className = "inline-select-label";
  const caret = document.createElement("span");
  caret.className = "inline-select-caret";
  caret.textContent = "▾";
  caret.setAttribute("aria-hidden", "true");
  btn.appendChild(labelEl);
  btn.appendChild(caret);

  const popover = document.createElement("ul");
  popover.className = "inline-select-popover";
  popover.setAttribute("role", "listbox");
  popover.hidden = true;

  const itemById = new Map();
  for (const item of items) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.id = item.id;
    li.textContent = item.label;
    li.tabIndex = 0;
    li.addEventListener("click", () => {
      onChange(item.id);
      closePopover();
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange(item.id);
        closePopover();
      }
    });
    popover.appendChild(li);
    itemById.set(item.id, li);
  }

  function refresh() {
    const active = items.find(i => i.id === activeId) || items[0];
    labelEl.textContent = active.label;
    // Tint the label with the option's canonical color (matches the series
    // colors in the Top/Major Industries figures); the caret stays grey.
    labelEl.style.color = resolveColor(active.color) || "";
    for (const [id, li] of itemById) {
      li.setAttribute("aria-selected", String(id === active.id));
      li.classList.toggle("is-active", id === active.id);
    }
  }
  refresh();

  let typeAheadBuffer = "";
  let typeAheadTimer = null;

  function focusItem(li) { if (li) li.focus(); }

  function openPopover() {
    popover.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    setTimeout(() => document.addEventListener("click", clickAway), 0);
    setTimeout(() => {
      const activeLi = itemById.get(activeId) || popover.firstElementChild;
      focusItem(activeLi);
    }, 0);
  }
  function closePopover() {
    popover.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", clickAway);
    typeAheadBuffer = "";
    clearTimeout(typeAheadTimer);
    btn.focus();
  }
  function clickAway(e) {
    if (!btn.contains(e.target) && !popover.contains(e.target)) closePopover();
  }

  function keyHandler(e) {
    if (e.key === "Escape") { e.preventDefault(); closePopover(); return; }
    if (e.key === "Enter" || e.key === " ") {
      const focused = document.activeElement;
      if (focused && focused.parentElement === popover) {
        e.preventDefault();
        focused.click();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const lis = Array.from(popover.children);
      const idx = lis.indexOf(document.activeElement);
      const next = e.key === "ArrowDown"
        ? lis[(idx + 1) % lis.length]
        : lis[(idx - 1 + lis.length) % lis.length];
      focusItem(next);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typeAheadBuffer += e.key.toLowerCase();
      clearTimeout(typeAheadTimer);
      typeAheadTimer = setTimeout(() => { typeAheadBuffer = ""; }, 600);
      const match = items.find(i => i.label.toLowerCase().startsWith(typeAheadBuffer));
      if (match) {
        e.preventDefault();
        focusItem(itemById.get(match.id));
      }
    }
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.hidden ? openPopover() : closePopover();
  });

  const wrap = document.createElement("span");
  wrap.className = "inline-select-wrap";
  wrap.appendChild(btn);
  wrap.appendChild(popover);
  wrap.addEventListener("keydown", keyHandler);
  return wrap;
}

function buildInlineTitleH3(titleTemplate, options, activeId, placeholderKey, onChange) {
  const h = document.createElement("h3");
  h.className = "figure-title";
  const token = `{${placeholderKey}}`;
  const parts = (titleTemplate || "").split(token);
  h.appendChild(document.createTextNode(parts[0] || ""));
  h.appendChild(buildInlineSelect(options, activeId, onChange));
  if (parts.length > 1) {
    h.appendChild(document.createTextNode(parts[1] || ""));
  }
  return h;
}

// ---------------------------------------------------------------------------
// X-axis adapters: one per xAxisType. Each parses raw CSV time strings,
// supplies the field name to plot, and contributes Plot marks + crosshair
// formatters.

function makeXAdapter(xType, xAxisPolicy) {
  if (xType === "numeric") {
    return {
      parseX: v => +v,
      xField: "_xn",
      validate: r => Number.isFinite(r._xn),
      buildXOpts(data) {
        const xMax = d3.max(data, d => d._xn);
        const anchorAtZero = xAxisPolicy?.anchorAtZero !== false;
        const xMin = anchorAtZero
          ? Math.min(0, d3.min(data, d => d._xn))
          : d3.min(data, d => d._xn);
        return {
          marginBottom: 22,
          xPlotOpts: { label: null, axis: null, domain: [xMin, xMax] },
          axisMarks: tblXAxis(),
          markerToX: m => +m.x,
          tooltipXParse: v => +v,
          tooltipXFormat: v => `Month ${v}`,
        };
      },
    };
  }
  // Margin for the two-line month/year vs the collapsed year-only axis.
  const temporalMarginBottom = (xDomain) => {
    const ticks = temporalXTicks(xDomain);
    const allJanuary = ticks.length > 0 && ticks.every(d => d.getMonth() === 0);
    return allJanuary ? 22 : 38;
  };
  if (xType === "temporal") {
    return {
      parseX: v => parseDate(v),
      xField: "_xd",
      validate: r => r._xd && !Number.isNaN(+r._xd),
      buildXOpts(data) {
        const xs = data.map(r => +r._xd);
        const xDomain = [new Date(d3.min(xs)), new Date(d3.max(xs))];
        return {
          marginBottom: temporalMarginBottom(xDomain),
          axisMarks: tblTemporalXAxis(xDomain),
          markerToX: m => parseDate(m.x),
          tooltipXParse: undefined, // crosshair auto-detects YYYY-MM-DD
          tooltipXFormat: undefined,
        };
      },
    };
  }
  if (xType === "quarterly") {
    return {
      parseX: v => parseQuarter(v),
      xField: "_xd",
      validate: r => r._xd && !Number.isNaN(+r._xd),
      buildXOpts(data) {
        const xs = data.map(r => +r._xd);
        const xDomain = [new Date(d3.min(xs)), new Date(d3.max(xs))];
        return {
          marginBottom: temporalMarginBottom(xDomain),
          axisMarks: tblTemporalXAxis(xDomain),
          markerToX: m => parseQuarter(m.x),
          tooltipXParse: v => +parseQuarter(v),
          tooltipXFormat: v => formatQuarter(new Date(v)),
        };
      },
    };
  }
  throw new Error(`Unknown xAxisType: ${xType}`);
}

// ---------------------------------------------------------------------------
// buildLineChart — pure chart builder shared by the live renderer and the
// PNG exporter. Returns a detached, fixed-pixel SVG plus the metadata needed
// to draw the legend and x-axis title. `width` defaults to Plot's own default
// (live path); the exporter passes an explicit publishable width.

export function buildLineChart(rows, chart, { width, height, marginRight, accentColor } = {}) {
  const xType = chart.xAxisType;
  if (!xType) throw new Error("No xAxisType.");

  const adapter = makeXAdapter(xType, chart.xAxisPolicy);
  // Which CSV column holds the series identifier. Default `"series"`;
  // any chart can override via `series_field` in its config.
  const seriesField = chart.series_field || "series";

  // Parse and validate rows. The CSV-column read happens here once;
  // downstream code always reads the canonical in-memory `series` key.
  const data = rows
    .map(r => {
      const row = {
        series: r[seriesField],
        time: r.time,
        _y: r.value === "" ? null : +r.value,
        //_y: +r.value, JOSH CHANGED THIS FOR BLANKS
      };
      row[adapter.xField] = adapter.parseX(r.time);
      for (const band of (chart.confidence_bands || [])) {
        if (r[seriesField] === band.series) {
          const lo = r[band.lower];
          const hi = r[band.upper];
          row._lo = (lo !== "" && lo != null) ? +lo : undefined;
          row._hi = (hi !== "" && hi != null) ? +hi : undefined;
        }
      }
      return row;
    })
    //.filter(r => adapter.validate(r) && Number.isFinite(r._y)); JOSH CHANGED THIS
    .filter(r => adapter.validate(r));

  if (!data.length) throw new Error("No data.");

  // Series order + colors. When series_order is set it acts as both
  // filter and order — only rows whose series is listed render, in that
  // sequence. Lets a single CSV serve multiple charts that pick subsets.
  const seriesNames = chart.series_order && chart.series_order.length
    ? chart.series_order.filter(s => data.some(r => r.series === s))
    : uniqueSeries(data);
  const seriesSet = new Set(seriesNames);
  const dataInScope = data.filter(r => seriesSet.has(r.series));
  const colors = buildColorMap(seriesNames, chart.series_colors);

  // Single-line charts driven by a colored selector (the by-industry figure)
  // take the selector's color, so the line matches the inline-title selector
  // and the industry's color in the Top/Major Industries figures. Multi-line
  // views (e.g. the fixed-baseline comparison) keep distinct palette colors.
  if (accentColor && seriesNames.length === 1) {
    colors.set(seriesNames[0], accentColor);
  }

  // Y-axis: include CI band bounds in the computed range when present.
  const yForAxis = [
    ...dataInScope.map(d => d._y),
    ...dataInScope.map(d => d._lo).filter(Number.isFinite),
    ...dataInScope.map(d => d._hi).filter(Number.isFinite),
  ];
  const policy = chart.yAxisPolicy || {};
  let yMax = policy.max;
  if (policy.autoWiden && yMax != null) {
    const dataMax = Math.max(...yForAxis.filter(Number.isFinite));
    if (dataMax > yMax) {
      const step = policy.autoWiden.step || 1;
      yMax = Math.ceil(dataMax / step) * step;
    }
  }
  const hardDomain = (policy.min != null && yMax != null) ? [policy.min, yMax] : null;
  const tickCount = policy.tickCount ?? 5;
  const { domain: yDomain, ticks: yTicks } = computeYAxis(yForAxis, {
    includeZero: policy.includeZero === true,
    domain: hardDomain,
    tickCount,
  });

  // X-axis opts.
  const xOpts = adapter.buildXOpts(dataInScope);
  const units = chart.units ?? inferUnitsFromSubtitle(chart.subtitle);

  // Build marks (paint order matters: bands → grid → axis → zero → markers → lines).
  const marks = [];

  for (const band of (chart.confidence_bands || [])) {
    const bandColor = colors.get(band.series) || TBL.color.blue;
    marks.push(Plot.areaY(
      dataInScope.filter(r => r.series === band.series && Number.isFinite(r._lo) && Number.isFinite(r._hi)),
      {
        x: adapter.xField, y1: "_lo", y2: "_hi",
        fill: bandColor, fillOpacity: 0.18,
      },
    ));
  }

  // Gridlines + zero baseline extend across both label columns (insetLeft /
  // insetRight) so the chart's left and right edges sit flush with the canvas.
  const effMarginRight = marginRight ?? TBL_MARGIN_RIGHT;
  marks.push(...gridAndYLabels(yTicks, {
    yTickFormat: makeTickFormatter(yTicks, units),
    marginRight: effMarginRight,
  }));
  marks.push(...xOpts.axisMarks);
  marks.push(Plot.ruleY([0], {
    stroke: TBL.color.axisStroke,
    strokeWidth: 1,
    insetLeft: -TBL_MARGIN_LEFT,
    insetRight: -effMarginRight,
    clip: false,
  }));

  for (const m of (chart.xAxisPolicy?.markers || [])) {
    const mx = xOpts.markerToX(m);
    if (mx == null) continue;
    marks.push(Plot.ruleX([mx], {
      stroke: m.color || TBL.color.annotationDim,
      strokeDasharray: (m.style || "dashed") === "dashed" ? "3 2" : null,
      strokeWidth: m.strokeWidth || 1,
    }));
  }

  // Group series into dashed vs solid so each group can be a single
  // Plot.line call (z: "series"). Dashed group is drawn first so the
  // solid lines paint over them when their paths cross (matches the
  // original SDID-levels look).
  const dashedNames = new Set();
  for (const [s, st] of Object.entries(chart.series_styles || {})) {
    if (st?.dashed) dashedNames.add(s);
  }
  const dashedData = dataInScope.filter(r => dashedNames.has(r.series));
  const solidData  = dataInScope.filter(r => !dashedNames.has(r.series));
  if (dashedData.length) {
    marks.push(Plot.line(dashedData, {
      x: adapter.xField, y: "_y", z: "series", stroke: "series",
      strokeWidth: TBL.strokeWidth.dashed,
      strokeDasharray: TBL.dashArray,
      defined: r => Number.isFinite(r._y),
    }));
  }
  if (solidData.length) {
    marks.push(Plot.line(solidData, {
      x: adapter.xField, y: "_y", z: "series", stroke: "series",
      strokeWidth: TBL.strokeWidth.solid,
      defined: r => Number.isFinite(r._y),
    }));
  }

  const plotOpts = {
    ...tblPlotDefaults({
      marginBottom: xOpts.marginBottom,
      ...(height != null ? { height } : {}),
      ...(marginRight != null ? { marginRight } : {}),
    }),
    ...(width ? { width } : {}),
    y: { label: null, axis: null, grid: false, domain: yDomain },
    color: { domain: seriesNames, range: seriesNames.map(s => colors.get(s)) },
    marks,
  };
  if (xOpts.xPlotOpts) plotOpts.x = xOpts.xPlotOpts;

  const svg = Plot.plot(plotOpts);
  svg.dataset.marginLeft   = plotOpts.marginLeft   ?? 0;
  svg.dataset.marginRight  = plotOpts.marginRight  ?? 8;
  svg.dataset.marginTop    = plotOpts.marginTop    ?? 18;
  svg.dataset.marginBottom = plotOpts.marginBottom ?? 28;

  // Tag <path data-series=…> for legend hover-dim. Plot.line with
  // z:"series" emits one path per unique series in data-encounter order;
  // tag each line group's paths against that group's own encounter order
  // so two-line-group splits (dashed-then-solid) stay correctly mapped
  // even when both groups share a color.
  const encounterOrder = (rs) => {
    const seen = new Set(), out = [];
    for (const r of rs) if (!seen.has(r.series)) { seen.add(r.series); out.push(r.series); }
    return out;
  };
  const groupOrders = [];
  if (dashedData.length) groupOrders.push(encounterOrder(dashedData));
  if (solidData.length)  groupOrders.push(encounterOrder(solidData));
  svg.querySelectorAll('g[aria-label="line"]').forEach((g, gi) => {
    const order = groupOrders[gi];
    if (!order) return;
    g.querySelectorAll("path").forEach((p, pi) => {
      if (pi < order.length) p.setAttribute("data-series", order[pi]);
    });
  });

  // Display labels: optional CSV-key → human-readable mapping. Other
  // config refs (series_order, series_colors, series_styles,
  // confidence_bands.series) keep using the short data key; only the
  // legend and tooltip get the friendly name.
  const seriesLabels = chart.series_labels || {};
  const labelFor = name => seriesLabels[name] || name;
  const hasDashOverrides = dashedNames.size > 0;

  // Legend items: computed when 2+ series OR any series has a style
  // override (e.g. SDID one-series-dashed comparison).
  const legendItems = (seriesNames.length > 1 || hasDashOverrides)
    ? seriesNames.map(name => ({
        series: name,
        label: labelFor(name),
        color: colors.get(name),
        dashed: chart.series_styles?.[name]?.dashed === true,
      }))
    : null;

  return {
    svg,
    legendItems,
    seriesLabels,
    seriesOrder: seriesNames,
    dashedNames,
    colors,
    units,
    xAxisTitle: chart.x_axis_title || null,
    dataInScope,
    tooltipXParse: xOpts.tooltipXParse,
    tooltipXFormat: xOpts.tooltipXFormat,
  };
}

// ---------------------------------------------------------------------------
// Chart sizing. As the container narrows we re-render the chart at the new
// width (compressing the x-axis) while holding height constant, down to
// MIN_CHART_WIDTH; below that the SVG stays at MIN_CHART_WIDTH and the scroll
// wrapper (overflow-x:auto) takes over. The floor lives here, not in CSS, and
// is set to the mobile/stacked-header breakpoint (390px, see styles.css) so
// the chart only switches to horizontal scrolling at mobile widths.
const MIN_CHART_WIDTH = 390;
const FIXED_CHART_HEIGHT = 400;

// createChartController — the universal chart constructor. Builds the chart
// (via buildLineChart) at the current container width, decorates it, and
// re-renders on container resize so the x-axis squashes instead of the whole
// figure scaling down. Returns a teardown() that disconnects all observers.
function createChartController({ canvas, canvasScroll, legendSlot, rows, chart, accentColor }) {
  let lastWidth = -1;
  let currentOverlay = null;
  let xTitleAdded = false;

  const draw = (availWidth) => {
    const target = Math.max(MIN_CHART_WIDTH, Math.round(availWidth));
    if (target === lastWidth) return;
    lastWidth = target;

    let built;
    try {
      built = buildLineChart(rows, chart, {
        width: target, height: FIXED_CHART_HEIGHT, accentColor,
      });
    } catch (e) {
      canvas.innerHTML = `<div class="figure-error">${escapeHtml(e.message)}</div>`;
      return;
    }
    const { svg, legendItems, seriesLabels, seriesOrder, dashedNames, colors, units,
            xAxisTitle, dataInScope, tooltipXParse, tooltipXFormat } = built;

    // Render at native px (no makeResponsive / viewBox): the SVG keeps its
    // exact pixel width so it overflows into the scroll wrapper below the
    // floor instead of being CSS-scaled down.
    canvas.replaceChildren(svg);

    // The x-axis title sits on canvasScroll (which survives re-render), so
    // add it once rather than on every redraw.
    if (!xTitleAdded) { appendXAxisTitle(canvas, xAxisTitle); xTitleAdded = true; }

    // Legend is rebuilt against the current svg: its hover-to-dim handler
    // closes over the svg's paths, so it must point at the live SVG.
    if (legendItems) {
      legendSlot.replaceChildren();
      renderLegend(legendSlot, legendItems, { svg });
    }

    attachCrosshair(svg, {
      rows: dataInScope.map(r => ({ time: r.time, series: r.series, value: r._y })),
      xField: "time", yField: "value", seriesField: "series",
      xParse: tooltipXParse,
      xFormat: tooltipXFormat,
      yFormat: v => formatTooltip(v, units),
      colors,
      dashedSeries: dashedNames,
      seriesLabels,
      seriesOrder,
    });

    currentOverlay?._ro?.disconnect();
    currentOverlay?.remove();
    currentOverlay = attachYAxisOverlay(canvasScroll, svg);
  };

  draw(canvasScroll.clientWidth || MIN_CHART_WIDTH);

  // Single persistent scrollLeft → translateX for the sticky y-axis overlay
  // (canvasScroll outlives the per-draw overlays, so one listener suffices).
  let scrollRaf = null;
  const onScroll = () => {
    if (scrollRaf !== null) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      if (currentOverlay) {
        currentOverlay.style.transform = `translateX(${canvasScroll.scrollLeft}px)`;
      }
    });
  };
  canvasScroll.addEventListener("scroll", onScroll);

  // Re-render on width change. Observe canvasScroll (the outer box): its width
  // is set by the layout column and is unaffected by the inner SVG widening,
  // so there's no feedback loop. Coalesce to one frame and read the live width
  // inside it so we never act on a stale measurement.
  let resizeRaf = null;
  const ro = new ResizeObserver(() => {
    if (resizeRaf !== null) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      draw(canvasScroll.clientWidth);
    });
  });
  ro.observe(canvasScroll);

  return () => {
    ro.disconnect();
    if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
    if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
    canvasScroll.removeEventListener("scroll", onScroll);
    currentOverlay?._ro?.disconnect();
  };
}

// ---------------------------------------------------------------------------
// Chart-config resolution: tab.figureDefaults → figure → chart → variant.

function resolveChart(chartCfg, figure, tab, toggles) {
  const merged = {
    ...(tab.figureDefaults || {}),
    ...chartCfg,
  };
  // Object policies (yAxisPolicy, xAxisPolicy) should shallow-merge from
  // tab defaults — chart-level entries override individual fields rather
  // than replacing the whole object.
  if (tab.figureDefaults?.yAxisPolicy) {
    merged.yAxisPolicy = { ...tab.figureDefaults.yAxisPolicy, ...(chartCfg.yAxisPolicy || {}) };
  }
  if (tab.figureDefaults?.xAxisPolicy) {
    merged.xAxisPolicy = { ...tab.figureDefaults.xAxisPolicy, ...(chartCfg.xAxisPolicy || {}) };
  }
  // series_colors shallow-merges per-key too, so a tab can define a shared
  // color map (e.g. industry → color) that figures inherit and extend. Keys
  // that don't match a figure's series are simply unused.
  if (tab.figureDefaults?.series_colors) {
    merged.series_colors = { ...tab.figureDefaults.series_colors, ...(chartCfg.series_colors || {}) };
  }
  if (Array.isArray(merged.variants) && merged.variants.length) {
    const activeId = pickActiveVariant(merged.variants, toggles, tab);
    const variant = merged.variants.find(v => v.id === activeId)
                 || merged.variants.find(v => v.default)
                 || merged.variants[0];
    const { variants: _drop, ...overrides } = variant;
    Object.assign(merged, overrides);
  }
  // Resolve {toggleId}/{selectorId} tokens in the subtitle and note to the
  // active option's label (e.g. "{variant}" → "Rolling 12-month"). Done here
  // so the resolved text flows to both the live render and the PNG export.
  merged.subtitle = resolveLabelTokens(merged.subtitle, merged, toggles, tab);
  merged.note = resolveLabelTokens(merged.note, merged, toggles, tab);
  return merged;
}

// Replace {id} tokens with the active option's display label: {selectorId} →
// active selector option, {toggleId} (e.g. variant / panel) → active toggle
// option. Unknown tokens are left untouched.
function resolveLabelTokens(text, chart, toggles, tab) {
  if (!text || text.indexOf("{") === -1) return text;
  return text.replace(/\{([\w-]+)\}/g, (m, key) => {
    const sel = (chart.selectors || []).find(s => s.id === key);
    if (sel) {
      const active = (toggles || {})[key] || sel.default;
      const opt = (sel.options || []).find(o => o.id === active);
      return opt ? opt.label : "";
    }
    const tog = (tab?.toggles || []).find(t => t.id === key);
    if (tog) {
      const active = (toggles || {})[key] || tog.default;
      const opt = (tog.options || []).find(o => o.id === active);
      return opt ? opt.label : "";
    }
    return m;
  });
}

export function pickActiveVariant(variants, toggles, tab) {
  for (const t of tab.toggles || []) {
    const tv = toggles[t.id];
    if (tv && variants.some(v => v.id === tv)) return tv;
  }
  // No toggle match → first variant. Variant default lives in
  // tracker.yaml's toggle.default; per-variant default flags are not
  // part of the schema (single source of truth).
  return variants[0].id;
}

async function loadChartData(chart, ctx) {
  if (!chart.data) throw new Error("Chart has no data");
  const rows = await ctx.fetchCsv(chart.data);
  let filtered = rows;

  // Variant filter: rows carry a `variant` column whose value matches
  // one variant.id. Pick the active variant from the active toggle.
  if (chart.variants?.length) {
    const activeId = pickActiveVariant(chart.variants, ctx.toggles, ctx.tab);
    filtered = filtered.filter(r => r.variant === activeId);
  }

  // Selector filter: kind=single → keep rows where row[selector.id] ==
  // active selector value. kind=all → no filter (every option renders).
  for (const sel of (chart.selectors || [])) {
    if (sel.kind === "single") {
      const activeId = ctx.toggles[sel.id] || sel.default;
      filtered = filtered.filter(r => r[sel.id] === activeId);
    }
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Public API.

export function renderCurrentUpdate(mount, { body_html } = {}) {
  mount.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "current-update";

  // Split body_html into one card per <h2> section. The markdown owns the
  // titles (## Current Update, ## Introduction, ...). Content before the
  // first h2 (if any) becomes an untitled lead card.
  const parsed = document.createElement("div");
  parsed.innerHTML = body_html || "";

  const cards = [];
  let current = null;
  for (const node of Array.from(parsed.childNodes)) {
    if (node.nodeType === 1 && node.tagName === "H2") {
      current = document.createElement("div");
      current.className = "current-update-card";
      cards.push(current);
    } else if (!current) {
      current = document.createElement("div");
      current.className = "current-update-card";
      cards.push(current);
    }
    current.appendChild(node);
  }

  cards.forEach(c => wrap.appendChild(c));
  mount.appendChild(wrap);
}

// Active chart controllers for the currently-rendered figure. Disconnected
// and reset whenever a new figure is rendered so their ResizeObservers and
// scroll listeners don't leak across tab/figure switches.
let figureControllers = [];

export async function renderFigure(mount, ctx) {
  for (const teardown of figureControllers) teardown();
  figureControllers = [];
  mount.innerHTML = "";
  const { tab, figure, toggles, updateToggle } = ctx;

  if (!figure?.charts?.length) {
    mount.innerHTML = '<div class="figure-error">Figure has no charts.</div>';
    return;
  }

  for (let i = 0; i < figure.charts.length; i++) {
    const chartCfg = figure.charts[i];
    const chart = resolveChart(chartCfg, figure, tab, toggles);
    const letterSuffix = chartCfg.chartLetter ?? "";
    if (SHOW_FIGURE_SUPERTITLE) {
      renderSupertitle(mount, `${tab.label} Figure ${figure.figureNum}${letterSuffix}`);
    }

    // Inline-title selector: chart declares a selector with ui:"title-inline".
    const inlineSel = (chart.selectors || []).find(
      s => s.ui === "title-inline" && s.kind === "single",
    );

    const isLastChart = i === figure.charts.length - 1;
    const { card, canvas, canvasScroll, legendSlot } = buildCard(mount, {
      title: inlineSel ? null : (chart.title || ""),
      subtitle: chart.subtitle,
    });

    if (inlineSel) {
      const activeId = toggles[inlineSel.id] || inlineSel.default;
      // Give each option a color: its explicit color, else the figure's
      // series color for the option's label (shared industry map).
      const selOptions = inlineSel.options.map(o => ({
        ...o, color: o.color || chart.series_colors?.[o.label],
      }));
      const titleH = buildInlineTitleH3(
        chart.title || `{${inlineSel.id}}`,
        selOptions,
        activeId,
        inlineSel.id,
        (newId) => updateToggle(inlineSel.id, newId),
      );
      card.insertBefore(titleH, card.firstChild);
    }

    let rows = [];
    try {
      rows = await loadChartData(chart, ctx);
      figureControllers.push(createChartController({
        canvas, canvasScroll, legendSlot, rows, chart,
        accentColor: activeSelectorColor(chart, toggles),
      }));
    } catch (e) {
      canvasError(canvas, e);
    }
    renderSourceLine(card, {
      note: chart.note,
      source: chart.source,
      actions: buildDownloadActions(figure, chart, ctx, rows),
    });
    // Description as the last item on the card. Figure-level (not
    // chart-level): on a multi-chart figure (SDID) it appears once,
    // under the last chart card, as a caption for the whole figure.
    if (isLastChart) {
      appendDescription(card, figure.description_html);
    }
  }
}
