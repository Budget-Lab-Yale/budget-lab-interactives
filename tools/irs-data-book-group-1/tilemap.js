/* ===========================================================================
 * IRS Data Book, Group 1 — tile-grid map of the 50 states and DC.
 *
 * The chart engine has no map type, so this tool draws its own: one equal
 * square per state, placed roughly where the state sits. Equal squares keep
 * DC and Rhode Island as visible as Texas, and leave room for each state's
 * abbreviation and value. Chrome (title, subtitle, legend, note, source) uses
 * the engine's own class names, so the card reads like every other figure.
 *
 * Spec (from config.md, chartType "tilemap"):
 *   columns        { state, abbr, value, note }   CSV column names
 *   value_prefix / value_suffix / decimals         value format
 *   bins           number of quantile bins (default 5)
 *   highlight_from toggle/selector id whose value names a state to outline
 * A state with no value is grey and says "n/a": the book printed no figure
 * that is that state (a district era, a combined or suppressed cell, a
 * column not yet published).
 * =========================================================================== */

// [column, row]. 51 tiles, checked on load.
const GRID = {
  AK: [0, 0], ME: [11, 0],
  WI: [6, 1], VT: [10, 1], NH: [11, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], IL: [6, 2], MI: [7, 2],
  NY: [9, 2], MA: [10, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IN: [6, 3], OH: [7, 3],
  PA: [8, 3], NJ: [9, 3], CT: [10, 3], RI: [11, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4],
  VA: [8, 4], MD: [9, 4], DE: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5],
  OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  HI: [0, 7], TX: [4, 7], FL: [9, 7],
};
if (Object.keys(GRID).length !== 51 ||
    new Set(Object.values(GRID).map(([c, r]) => `${c},${r}`)).size !== 51) {
  throw new Error("tilemap: GRID must hold 51 distinct tiles");
}

// Chart-engine blue ramp, steps 50/200/300/500/700: lightness falls step by step.
const RAMP = ["#95DAFF", "#58A3E7", "#3689CB", "#005794", "#002B61"];
const DARK_TEXT_BINS = 2;           // bins 0-1 take dark text; 2-4 take white
const NA_FILL = "#E5E5E5";
const TILE = 50, GAP = 4;
const SVGNS = "http://www.w3.org/2000/svg";

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function svg(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  return e;
}

function makeFormat(spec, values) {
  const max = Math.max(...values.map(Math.abs), 0);
  const d = spec.decimals ?? (max >= 1000 ? 0 : max >= 100 ? 0 : 1);
  const pre = spec.value_prefix || "", suf = spec.value_suffix || "";
  return (v) => {
    const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    return `${v < 0 ? "-" : ""}${pre}${s}${suf}`;
  };
}

// Quantile breaks over the states that have a value; ties collapse, so a map
// with few distinct values gets fewer bins rather than empty ones.
function quantileBreaks(values, n) {
  const s = [...values].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const cuts = [];
  for (let i = 1; i < n; i++) cuts.push(q(i / n));
  return [...new Set(cuts)];
}
const binOf = (v, cuts) => { let b = 0; while (b < cuts.length && v >= cuts[b]) b++; return b; };

export function mountTileMap(card, { spec, rows, toggles }) {
  const cols = { state: "state", abbr: "abbr", value: "value", note: "note", ...(spec.columns || {}) };
  // A note cell holds a code into spec.note_texts (each text stored once), or the text itself.
  const noteOf = (c) => (c && spec.note_texts && spec.note_texts[c]) || c || "";
  const byAbbr = new Map();
  for (const r of rows) {
    const v = r[cols.value] === "" || r[cols.value] == null ? null : Number(r[cols.value]);
    byAbbr.set(r[cols.abbr], { state: r[cols.state], value: Number.isFinite(v) ? v : null, note: noteOf(r[cols.note]) });
  }
  const values = [...byAbbr.values()].map((d) => d.value).filter((v) => v != null);
  const fmt = makeFormat(spec, values);
  const cuts = values.length ? quantileBreaks(values, spec.bins || 5) : [];
  const ramp = cuts.length + 1 >= RAMP.length ? RAMP : RAMP.slice(RAMP.length - (cuts.length + 1));
  const highlight = spec.highlight_from ? toggles?.[spec.highlight_from] : null;

  const fig = el("div", "figure-card chart-tilemap");
  const head = el("div", "figure-header");
  const bar = el("div", "figure-titlebar");
  bar.appendChild(el("div", "figure-title", spec.title || ""));
  head.appendChild(bar);
  if (spec.subtitle) head.appendChild(el("div", "figure-subtitle", spec.subtitle));
  fig.appendChild(head);

  // Legend: one swatch per bin with its range, then n/a.
  const legend = el("div", "tbl-legend tilemap-legend");
  const lo = values.length ? Math.min(...values) : 0, hi = values.length ? Math.max(...values) : 0;
  const edges = [lo, ...cuts, hi];
  ramp.forEach((c, i) => {
    const item = el("span", "tbl-legend-item");
    const sw = el("span", "tbl-legend-swatch"); sw.style.background = c;
    item.append(sw, document.createTextNode(`${fmt(edges[i])} to ${fmt(edges[i + 1])}`));
    legend.appendChild(item);
  });
  const na = el("span", "tbl-legend-item");
  const nasw = el("span", "tbl-legend-swatch"); nasw.style.background = NA_FILL;
  na.append(nasw, document.createTextNode("Not available"));
  legend.appendChild(na);
  fig.appendChild(legend);

  const W = 12 * (TILE + GAP), H = 8 * (TILE + GAP);
  const root = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "tilemap-svg", role: "img",
    "aria-label": spec.title || "Map of the states" });
  for (const [abbr, [c, r]] of Object.entries(GRID)) {
    const d = byAbbr.get(abbr) || { state: abbr, value: null, note: "" };
    const b = d.value == null ? null : binOf(d.value, cuts) - (cuts.length + 1 - ramp.length);
    const g = svg("g", { transform: `translate(${c * (TILE + GAP)},${r * (TILE + GAP)})`, class: "tilemap-tile" });
    const rect = svg("rect", { width: TILE, height: TILE, rx: 4,
      fill: b == null ? NA_FILL : ramp[Math.max(0, b)] });
    if (highlight && d.state === highlight) { rect.setAttribute("stroke", "#101F5B"); rect.setAttribute("stroke-width", 3); }
    g.appendChild(rect);
    const ink = b == null || b < DARK_TEXT_BINS ? "#1A1A2E" : "#FFFFFF";
    const t1 = svg("text", { x: TILE / 2, y: 21, "text-anchor": "middle", fill: ink, class: "tilemap-abbr" });
    t1.textContent = abbr;
    const t2 = svg("text", { x: TILE / 2, y: 38, "text-anchor": "middle", fill: ink, class: "tilemap-value" });
    t2.textContent = d.value == null ? "n/a" : fmt(d.value);
    g.append(t1, t2);
    const tip = svg("title");
    tip.textContent = `${d.state}: ${d.value == null ? "not available" : fmt(d.value)}${d.note ? `\n${d.note}` : ""}`;
    g.appendChild(tip);
    root.appendChild(g);
  }
  const canvas = el("div", "figure-canvas tilemap-canvas");
  canvas.appendChild(root);
  fig.appendChild(canvas);

  if (spec.note) fig.appendChild(el("div", "figure-note", spec.note));
  if (spec.source) {
    const src = el("div", "figure-source");
    src.append(el("span", "figure-source-prefix", "Source: "), document.createTextNode(spec.source));
    fig.appendChild(src);
  }
  card.appendChild(fig);
  return () => { card.innerHTML = ""; };
}
