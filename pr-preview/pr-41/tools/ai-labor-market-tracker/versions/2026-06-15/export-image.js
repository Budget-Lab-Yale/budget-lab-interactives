/* ===========================================================================
 * export-image.js — client-side "download chart as PNG".
 *
 * Reuses buildLineChart() to render the chart at a fixed publishable width,
 * composes a single self-contained export SVG (chart + title/subtitle/legend/
 * axis title/note/source as native SVG, Figtree embedded as a base64
 * @font-face, TBL logo inline), and rasterizes it to a 2x canvas. No
 * foreignObject (Safari-safe), no external resources (canvas never taints).
 * =========================================================================== */

import { buildLineChart, pickActiveVariant, activeSelectorColor } from "./charts.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

// Layout tokens (CSS px; multiplied by SCALE at raster time). Fixed
// 1000x750 content → 2000x1500 PNG, so every export shares one 4:3 frame.
const W = 1000;
const H = 750;
const MARGIN = 40;                        // outer padding (all sides)
const INNER_W = W - MARGIN * 2;
const LOGO_W = 150, LOGO_H = LOGO_W / 4;   // logo.svg viewBox is 216x54 (4:1)
const LOGO_BASELINE_FRAC = 0.87;           // wordmark baseline at y≈74 in the 27–81 viewBox
const SCALE = 2;

// Figtree weight scale — matches the on-screen --tw-* weights in styles.css.
const W_BODY = 500, W_SEMI = 700, W_BOLD = 800;

const FONT = "Figtree, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
const NAVY = "#101F5B", MUTED = "#6D6D6D", BODY = "#4A4A4A",
      AXIS = "#666666", HEADING = "#1A1A2E";

let _fontFace, _logo, _measureCtx;

function measureText(text, font) {
  if (!_measureCtx) _measureCtx = document.createElement("canvas").getContext("2d");
  _measureCtx.font = font;
  return _measureCtx.measureText(text).width;
}

function wrapText(text, font, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (line && measureText(trial, font) > maxWidth) { lines.push(line); line = w; }
    else line = trial;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function b64FromBuffer(buf) {
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function getFontFace() {
  if (_fontFace) return _fontFace;
  if (typeof window !== "undefined" && window.__figtreeFontFace) {
    _fontFace = window.__figtreeFontFace;
    return _fontFace;
  }
  const res = await fetch(new URL("./fonts/Figtree-variable.ttf", import.meta.url));
  const b64 = b64FromBuffer(await res.arrayBuffer());
  _fontFace = `@font-face{font-family:'Figtree';src:url(data:font/ttf;base64,${b64}) format('truetype');font-weight:300 900;font-style:normal;}`;
  return _fontFace;
}

async function getLogo() {
  if (_logo) return _logo;
  if (typeof window !== "undefined" && window.__logoDataUrl) {
    _logo = window.__logoDataUrl;
    return _logo;
  }
  const res = await fetch(new URL("../../../../assets/logo.svg", import.meta.url));
  const svg = await res.text();
  const bytes = new TextEncoder().encode(svg);
  _logo = "data:image/svg+xml;base64," + b64FromBuffer(bytes.buffer);
  return _logo;
}

function resolveTitle(chart, toggles) {
  let title = chart.title || "";
  for (const sel of (chart.selectors || [])) {
    const active = toggles[sel.id] || sel.default;
    const opt = (sel.options || []).find(o => o.id === active);
    title = title.replaceAll(`{${sel.id}}`, opt ? opt.label : "");
  }
  return title;
}

function stateSuffix(chart, ctx) {
  const parts = [];
  if (chart.chartLetter) parts.push(chart.chartLetter);
  if (Array.isArray(chart.variants) && chart.variants.length) {
    parts.push(pickActiveVariant(chart.variants, ctx.toggles, ctx.tab));
  }
  for (const sel of (chart.selectors || [])) {
    if (sel.kind === "single") parts.push(ctx.toggles[sel.id] || sel.default);
  }
  return parts.length ? "-" + parts.join("-") : "";
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function textEl(x, y, str, { size, weight = 400, fill = HEADING, anchor = "start" }) {
  const t = svgEl("text", {
    x, y, fill, "font-family": FONT, "font-size": size,
    "font-weight": weight, "text-anchor": anchor,
  });
  t.textContent = str;
  return t;
}

// Draw wrapped text lines from a first baseline; return the last baseline y.
function drawLines(root, lines, x, firstBaseline, lineHeight, opt) {
  let by = firstBaseline;
  for (const line of lines) { root.appendChild(textEl(x, by, line, opt)); by += lineHeight; }
  return lines.length ? by - lineHeight : firstBaseline;
}

// Draw the legend as wrapping rows of swatch + label; return last row baseline.
function drawLegend(root, items, firstBaseline) {
  const legendFont = `${W_BODY} 13px ${FONT}`;
  const SW = 22, GAP = 6, ITEM_GAP = 18, ROW_H = 20;
  let x = MARGIN, y = firstBaseline;
  for (const item of items) {
    const itemW = SW + GAP + measureText(item.label, legendFont);
    if (x > MARGIN && x + itemW > MARGIN + INNER_W) { x = MARGIN; y += ROW_H; }
    const cy = y - 4;
    if (item.dashed) {
      root.appendChild(svgEl("line", { x1: x, y1: cy, x2: x + SW, y2: cy,
        stroke: item.color, "stroke-width": 2, "stroke-dasharray": "5 3" }));
    } else {
      root.appendChild(svgEl("rect", { x, y: cy - 2, width: SW, height: 4, fill: item.color }));
    }
    root.appendChild(textEl(x + SW + GAP, y, item.label, { size: 13, weight: W_BODY, fill: BODY }));
    x += itemW + ITEM_GAP;
  }
  return y;
}

// Compose the export SVG at a fixed W×H. The chart is built twice: once to
// read its legend items + axis title, then again at the height left over
// after the chrome so the whole figure fills the 4:3 frame. Returns
// { svg, width, height }.
function buildExportSvg(chart, rows, ctx, fontFace, logoUrl) {
  const meta = buildLineChart(rows, chart, { width: INNER_W });
  const legendItems = meta.legendItems || [];
  const xAxisTitle = meta.xAxisTitle || "";

  const title = resolveTitle(chart, ctx.toggles);
  const subtitle = chart.subtitle || "";
  const note = chart.note || "";
  const source = chart.source || "";

  const root = svgEl("svg", { xmlns: SVG_NS, "xmlns:xlink": XLINK_NS, width: W, height: H });
  const defs = svgEl("defs");
  const style = svgEl("style");
  style.textContent = fontFace;
  defs.appendChild(style);
  root.appendChild(defs);
  root.appendChild(svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "#FFFFFF" }));

  // --- top chrome: title (+ logo), subtitle, legend ---
  const titleFirstBaseline = MARGIN + 22;
  const titleLines = wrapText(title, `${W_BOLD} 22px ${FONT}`, INNER_W - LOGO_W - 24);
  let cursor = drawLines(root, titleLines, MARGIN, titleFirstBaseline, 28,
    { size: 22, weight: W_BOLD, fill: NAVY });

  // Logo: right edge flush with the content-right bound; baseline shared
  // with the title's first line.
  const logoY = titleFirstBaseline - LOGO_H * LOGO_BASELINE_FRAC;
  const logo = svgEl("image", { x: W - MARGIN - LOGO_W, y: logoY, width: LOGO_W, height: LOGO_H });
  logo.setAttributeNS(XLINK_NS, "href", logoUrl);
  logo.setAttribute("href", logoUrl);
  root.appendChild(logo);

  if (subtitle) {
    cursor = drawLines(root, wrapText(subtitle, `${W_SEMI} 14px ${FONT}`, INNER_W),
      MARGIN, cursor + 24, 19, { size: 14, weight: W_SEMI, fill: MUTED });
  }
  if (legendItems.length) {
    cursor = drawLegend(root, legendItems, cursor + 26);
  }
  const chartTop = cursor + 14;

  // Reserve the bottom-chrome height so the chart fills the rest (total == H).
  const noteLines = note ? wrapText(note, `${W_BODY} 11px ${FONT}`, INNER_W) : [];
  let bottomH = 0;
  if (xAxisTitle) bottomH += 14;
  if (noteLines.length) bottomH += 18 + (noteLines.length - 1) * 15;
  if (source) bottomH += note ? 15 : 18;
  bottomH += MARGIN - 15;   // bottom padding (baseline slack ≈ MARGIN)
  const chartHeight = Math.max(160, H - chartTop - bottomH);

  // Chart, sized to fill. Gridlines reach both content edges via the chart's
  // own insetLeft/insetRight, so left/right padding is symmetric.
  const { svg: chartSvg } = buildLineChart(rows, chart,
    { width: INNER_W, height: chartHeight, accentColor: activeSelectorColor(chart, ctx.toggles) });
  chartSvg.setAttribute("x", MARGIN);
  chartSvg.setAttribute("y", chartTop);
  chartSvg.setAttribute("width", INNER_W);
  chartSvg.setAttribute("height", chartHeight);
  root.appendChild(chartSvg);

  // --- bottom chrome: x-axis title, note, source ---
  let by = chartTop + chartHeight;
  if (xAxisTitle) {
    by += 14;
    root.appendChild(textEl(W / 2, by, xAxisTitle, { size: 12, weight: W_BODY, fill: AXIS, anchor: "middle" }));
  }
  if (noteLines.length) {
    by = drawLines(root, noteLines, MARGIN, by + 18, 15, { size: 11, weight: W_BODY, fill: MUTED });
  }
  if (source) {
    by += note ? 15 : 18;
    const g = svgEl("text", { x: MARGIN, y: by, fill: MUTED, "font-family": FONT,
      "font-size": 11, "font-weight": W_BODY, "text-anchor": "start" });
    const pfx = svgEl("tspan", { "font-weight": W_SEMI });
    pfx.textContent = "Source: ";
    g.appendChild(pfx);
    g.appendChild(document.createTextNode(source));
    root.appendChild(g);
  }

  return { svg: root, width: W, height: H };
}

async function rasterize(svgEl, width, height) {
  const svgStr = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("SVG image failed to load"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * SCALE);
    canvas.height = Math.round(height * SCALE);
    const c = canvas.getContext("2d");
    c.scale(SCALE, SCALE);
    c.drawImage(img, 0, 0);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob returned null")), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke: a programmatic download starts asynchronously, and revoking
  // in the same task can drop the file in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exportFigureBlob(chart, rows, ctx) {
  await (document.fonts?.ready ?? Promise.resolve());
  const [fontFace, logoUrl] = await Promise.all([getFontFace(), getLogo()]);
  const { svg, width, height } = buildExportSvg(chart, rows, ctx, fontFace, logoUrl);
  return rasterize(svg, width, height);
}

export async function exportFigurePng(chart, rows, ctx) {
  const blob = await exportFigureBlob(chart, rows, ctx);
  triggerDownload(blob, `${ctx.figure.id}${stateSuffix(chart, ctx)}.png`);
}
