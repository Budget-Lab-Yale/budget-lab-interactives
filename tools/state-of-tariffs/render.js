/* ===========================================================================
 * State of Tariffs — figure render layer (vendored chart engine).
 *
 * Replaces the AI Labor Market Tracker's bespoke charts.js / tbl-chart.js.
 * Each figure is rendered by the vendored engine (window.BudgetLabChart):
 *   - chart figures  -> mountChart(el, { spec, rows, eyebrow, downloadName })
 *   - table figures  -> mountTable(el, { spec, rows, eyebrow, downloadName })
 * The engine renders the full figure card (title, source line, logo, data/PNG
 * download, crosshair/legend). This module's job is data shaping: pick the
 * active variant + selector values, filter rows, merge per-variant spec
 * overrides, substitute {token}s in the title/subtitle, and append the
 * figure's markdown prose below the engine card.
 * =========================================================================== */

// Active engine teardown fns for the currently-rendered figure. Called before
// rendering the next one so the engine's ResizeObservers / listeners don't leak.
let teardowns = [];

function engine() {
  const e = window.BudgetLabChart;
  if (!e) throw new Error("Chart engine bundle not loaded (window.BudgetLabChart missing).");
  return e;
}

// Pick the active variant id: the first tab toggle whose current value names a
// variant. Falls back to the first variant. Mirrors the tracker's behavior —
// the variant default lives in the tab toggle's `default`.
function pickActiveVariant(variants, toggles, tab) {
  for (const t of tab.toggles || []) {
    const tv = toggles[t.id];
    if (tv && variants.some(v => v.id === tv)) return tv;
  }
  return variants[0].id;
}

// Build a { tokenId: activeLabel } map from the active tab toggles and figure
// selectors, so `{variant}` / `{sector}` etc. in titles resolve to labels.
function tokenLabels(tab, figure, toggles) {
  const map = {};
  for (const t of tab.toggles || []) {
    const active = toggles[t.id] ?? t.default;
    const opt = t.options?.find(o => o.id === active);
    if (opt) map[t.id] = opt.label;
  }
  for (const sel of figure.selectors || []) {
    const active = toggles[sel.id] ?? sel.default;
    const opt = sel.options?.find(o => o.id === active);
    if (opt) map[sel.id] = opt.label;
  }
  return map;
}

function substituteTokens(str, labels) {
  if (typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (m, key) => (key in labels ? labels[key] : m));
}

// Shallow-merge a variant's spec overrides onto the base spec, then substitute
// {token}s in title/subtitle.
function resolveSpec(figure, variant, labels) {
  const spec = { ...figure.spec, ...(variant?.spec || {}) };
  if (spec.title) spec.title = substituteTokens(spec.title, labels);
  if (spec.subtitle) spec.subtitle = substituteTokens(spec.subtitle, labels);
  return spec;
}

// Filter rows by the active variant (the `variant` column), by each single-select selector
// (a column named after the selector id), and by any tab-level toggle whose id names a data
// column (e.g. a `measure` level/delta toggle that applies across a tab's figures). Tab
// toggles persist across figure switches, so this gives a global, sticky filter — unlike
// per-figure selectors, which reset. A tab toggle that instead drives variants names no data
// column, so it is left to pickActiveVariant.
function filterRows(rows, tab, figure, variantId, toggles) {
  let out = rows;
  if (figure.variants?.length && variantId != null) {
    out = out.filter(r => r.variant === variantId);
  }
  for (const sel of figure.selectors || []) {
    const active = toggles[sel.id] ?? sel.default;
    out = out.filter(r => r[sel.id] === active);
  }
  const hasColumn = (id) => out.length > 0 && Object.prototype.hasOwnProperty.call(out[0], id);
  for (const t of tab.toggles || []) {
    if (t.applies_to_figures && !t.applies_to_figures.includes(figure.id)) continue;
    if (!hasColumn(t.id)) continue;
    const active = toggles[t.id] ?? t.default;
    out = out.filter(r => r[t.id] === active);
  }
  return out;
}


// A "total"/aggregate row is delivered inline in the model data (e.g. category=='Total',
// country_code=='total', category_code=='overall_gdp'). Figures declare which rows are the
// total via `figure.total`, and this shapes them per the spec's two recurring needs:
//   - toggle it in/out of the chart (a tab toggle, since x_order can't filter categories); and
//   - render it distinctly (promote the total rows to their own series so it gets its own
//     color and can be ordered apart from the rest).
// Config (figure.total):
//   { column, value,          // which rows are the total
//     toggle?, show_option?,   // tab toggle id gating visibility (+ the option id meaning "shown")
//     as_series?, rest_series? // relabel total (and optionally non-total) rows into these series
//   }
function applyTotal(rows, figure, toggles) {
  const t = figure.total;
  if (!t || !t.column) return rows;
  const isTotal = (r) => String(r[t.column]) === String(t.value);

  if (t.hide) return rows.filter((r) => !isTotal(r));

  if (t.toggle) {
    const shown = (toggles[t.toggle] ?? "") === (t.show_option ?? "on");
    if (!shown) return rows.filter((r) => !isTotal(r));
  }

  if (t.as_series) {
    const seriesCol = figure.spec?.columns?.series || "series";
    return rows.map((r) => {
      if (isTotal(r)) return { ...r, [seriesCol]: t.as_series };
      return t.rest_series ? { ...r, [seriesCol]: t.rest_series } : r;
    });
  }
  return rows;
}

// A tab-toggle option may carry a `series_color`; when active, recolor every series to it. Used
// so the "change vs. default" view reads in one distinct hue (violet) regardless of scenario.
// Clones series_colors so the shared manifest spec isn't mutated across re-renders.
function applyToggleColor(spec, tab, figure, toggles, rows) {
  for (const t of tab.toggles || []) {
    if (t.applies_to_figures && !t.applies_to_figures.includes(figure.id)) continue;
    const active = toggles[t.id] ?? t.default;
    const opt = t.options?.find((o) => o.id === active);
    if (!opt?.series_color) continue;
    const scol = spec.columns?.series;
    const names = scol ? [...new Set(rows.map((r) => r[scol]))] : [""];
    spec.series_colors = { ...(spec.series_colors || {}) };
    for (const n of names) spec.series_colors[n] = opt.series_color;
  }
}

// The engine keys header leaves by the LAST header value only, so a multi-tier header whose leaf
// value repeats across banner groups (e.g. header [measure, substitution] where presub/postsub
// recur under both Levels and Change-vs-default) collides — later groups' columns get dropped.
// When that collision exists, synthesize a unique leaf column (full header path) and remap
// header_labels so each synthetic leaf shows its original last-value label. No-op otherwise.
const HSEP = "";
function dedupeHeaderLeaves(rows, spec) {
  const header = spec.header;
  if (!Array.isArray(header) || header.length < 2) return rows;
  const cols = header.map((c) => (c && typeof c === "object" ? c.label : c));
  const last = cols[cols.length - 1];
  const pathsByLast = new Map();
  for (const r of rows) {
    const lv = String(r[last] ?? "");
    (pathsByLast.get(lv) || pathsByLast.set(lv, new Set()).get(lv)).add(cols.map((c) => r[c] ?? "").join(HSEP));
  }
  if (![...pathsByLast.values()].some((s) => s.size > 1)) return rows; // no collision

  const leafCol = "__leaf";
  const out = rows.map((r) => ({ ...r, [leafCol]: cols.map((c) => r[c] ?? "").join(HSEP) }));
  spec.header = [...header.slice(0, -1), leafCol];
  const labels = { ...(spec.header_labels || {}) };
  for (const r of out) {
    const lk = r[leafCol];
    if (!(lk in labels)) labels[lk] = spec.header_labels?.[r[last]] ?? r[last] ?? "";
  }
  spec.header_labels = labels;
  if (spec.column_order) delete spec.column_order; // old leaf values no longer match; first-seen order is correct
  return out;
}

// The engine's table renderer emits a row-group header only on a group's FIRST appearance and
// assumes each group's rows are contiguous. Tidy model data is often ordered by another key
// (e.g. scenario-major), which detaches a group's later rows. Stable-reorder rows so each stub
// group is contiguous (group order = first-seen; within-group order preserved).
function groupContiguousRows(rows, spec) {
  const stub = spec?.stub;
  if (!Array.isArray(stub) || stub.length < 2) return rows;
  const groupCols = stub.slice(0, -1).map((e) => (e && typeof e === "object" ? e.label : e));
  const keyOf = (r) => groupCols.map((c) => r[c] ?? "").join("");
  const firstSeen = new Map();
  for (const r of rows) { const k = keyOf(r); if (!firstSeen.has(k)) firstSeen.set(k, firstSeen.size); }
  return rows
    .map((r, i) => [r, i])
    .sort((a, b) => (firstSeen.get(keyOf(a[0])) - firstSeen.get(keyOf(b[0]))) || (a[1] - b[1]))
    .map(([r]) => r);
}

// Render the total/aggregate rows as a reference-line ANNOTATION instead of a bar: pull the
// matching rows out of the data and push a line (horizontal for vertical bars → yAxis; vertical
// for horizontal bars → xAxis) at each total's value onto the (cloned) spec.annotations. Used
// where a total bar reads poorly (e.g. a faceted chart). Returns the non-total rows.
// figure.total.annotation: { label?, color?, style? }.
function injectTotalAnnotation(spec, rows, figure) {
  const t = figure.total;
  const isTotal = (r) => String(r[t.column]) === String(t.value);
  const totals = rows.filter(isTotal);
  if (!totals.length) return rows;

  const horizontal = spec.orientation === "horizontal";
  const axis = horizontal ? "xAxis" : "yAxis";
  const coord = horizontal ? "x" : "y";
  const valueCol = spec.columns?.value || "value";

  // Pass every annotation field through to the engine (label, color, style, labelSide,
  // labelPosition, …). Convenience: `position: under|over` maps to the engine's `labelSide`
  // (which side of a horizontal reference line the label sits — bottom|top).
  const a = { ...(t.annotation || {}) };
  if (a.position) {
    if (!horizontal) a.labelSide = /^(over|above|top)$/.test(a.position) ? "top" : "bottom";
    delete a.position;
  }
  // `{value}` in the label is replaced with the total's own value, formatted per value_format
  // ({decimals?, prefix?, suffix?}); value_format is a render-side hint, not an engine field.
  const labelTemplate = a.label;
  const vfmt = a.value_format;
  delete a.value_format;

  // Clone so we never accumulate into the shared manifest spec across re-renders.
  spec.annotations = { ...(spec.annotations || {}) };
  const list = [...(spec.annotations[axis] || [])];
  for (const tr of totals) {
    const v = Number(tr[valueCol]);
    if (!Number.isFinite(v)) continue;
    const line = { [coord]: v, ...a };
    if (typeof labelTemplate === "string" && labelTemplate.includes("{value}")) {
      line.label = labelTemplate.replace("{value}", formatAnnotationValue(v, vfmt));
    }
    list.push(line);
  }
  spec.annotations[axis] = list;
  return rows.filter((r) => !isTotal(r));
}

function formatAnnotationValue(v, f = {}) {
  const d = f?.decimals ?? 1;
  return (f?.prefix || "") + v.toFixed(d) + (f?.suffix || "");
}

// Collapsible table row-groups (tool-side; a candidate engine feature). Adds a caret to each
// group header, toggles the group's rows, and an expand/collapse-all toolbar. State lives in a
// closure Map so it survives the engine's ResizeObserver re-render (which replaces the table DOM);
// a MutationObserver reapplies to each freshly-rendered table. figure.collapsible:
//   { default: "collapsed"|"expanded", expanded?: [names], collapsed?: [names] }
function setupCollapsible(mount, card, figure, registerTeardown) {
  const cfg = figure.collapsible;
  if (!cfg) return;
  const collapsed = new Map(); // groupName -> bool (persists across re-renders)

  const initState = (name) => {
    if (collapsed.has(name)) return;
    let c = cfg.default !== "expanded"; // default collapsed unless told otherwise
    if (Array.isArray(cfg.expanded) && cfg.expanded.includes(name)) c = false;
    if (Array.isArray(cfg.collapsed) && cfg.collapsed.includes(name)) c = true;
    collapsed.set(name, c);
  };

  const groupsOf = (table) => {
    const groups = [];
    let cur = null;
    for (const tr of table.querySelectorAll("tbody tr")) {
      if (tr.classList.contains("tbl-table-group")) {
        cur = { header: tr, name: tr.textContent.trim(), rows: [] };
        groups.push(cur);
      } else if (cur) cur.rows.push(tr);
    }
    return groups;
  };

  const setAll = (all) => {
    for (const k of collapsed.keys()) collapsed.set(k, all);
    const t = card.querySelector("table");
    if (t) applyToTable(t);
  };

  // Expand/collapse-all control, placed in the table's top-left corner cell (the stub-header,
  // above the row labels). Re-injected on each apply since the engine's re-render rebuilds it.
  function injectCornerControl(table) {
    const corner = table.querySelector("thead .tbl-table-stub-header") || table.querySelector("thead th");
    if (!corner || corner.querySelector(".collapse-toolbar")) return;
    const bar = document.createElement("div");
    bar.className = "collapse-toolbar";
    const mkBtn = (label, all) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "collapse-all-btn";
      b.textContent = label;
      b.addEventListener("click", (e) => { e.stopPropagation(); setAll(all); });
      return b;
    };
    bar.append(mkBtn("Expand all", false), mkBtn("Collapse all", true));
    corner.appendChild(bar);
  }

  function applyToTable(table) {
    table.dataset.collapsible = "1";
    for (const g of groupsOf(table)) {
      initState(g.name);
      const th = g.header.querySelector("th");
      // Insert the caret inside the group-label element so it sits inline to the LEFT of the
      // label (the inner is block-level, so a caret placed before it would stack above instead).
      const labelEl = th.querySelector(".tbl-table-group-inner") || th;
      if (!th.querySelector(".collapse-caret")) {
        const caret = document.createElement("span");
        caret.className = "collapse-caret";
        caret.setAttribute("aria-hidden", "true");
        labelEl.insertBefore(caret, labelEl.firstChild);
        g.header.classList.add("is-collapsible");
        g.header.addEventListener("click", () => {
          collapsed.set(g.name, !collapsed.get(g.name));
          applyToTable(table);
        });
      }
      const isC = collapsed.get(g.name);
      g.header.classList.toggle("is-collapsed", isC);
      for (const r of g.rows) r.style.display = isC ? "none" : "";
    }
    injectCornerControl(table);
  }

  const first = card.querySelector("table");
  if (first) applyToTable(first);

  const obs = new MutationObserver(() => {
    const t = card.querySelector("table:not([data-collapsible])");
    if (t) applyToTable(t);
  });
  obs.observe(card, { childList: true, subtree: true });
  registerTeardown(() => obs.disconnect());
}

// The figure's markdown body renders as unboxed prose either below the figure card (a
// description, the default) or above it (a "lead" intro, when figure.lead is set).
function renderDescription(mount, body_html, lead) {
  if (!body_html) return;
  const desc = document.createElement("div");
  desc.className = lead ? "figure-description figure-lead" : "figure-description";
  desc.innerHTML = body_html;
  mount.appendChild(desc);
}

// ---------------------------------------------------------------------------
// Public API.

export async function renderFigure(mount, ctx) {
  for (const t of teardowns) { try { t(); } catch { /* ignore */ } }
  teardowns = [];
  mount.innerHTML = "";

  const { tab, figure, toggles, fetchCsv } = ctx;
  if (!figure.spec) {
    mount.innerHTML = '<div class="figure-error">Figure has no spec.</div>';
    return;
  }

  const labels = tokenLabels(tab, figure, toggles);
  const variantId = figure.variants?.length ? pickActiveVariant(figure.variants, toggles, tab) : null;
  const variant = figure.variants?.find(v => v.id === variantId);
  const spec = resolveSpec(figure, variant, labels);

  // The description/lead prose supports the same {toggleId}/{selectorId} tokens as the
  // title/subtitle, so body copy updates with the active toggle too.
  const bodyHtml = substituteTokens(figure.body_html, labels);

  // Lead text renders above the figure card; a plain description renders below it (later).
  if (figure.lead) renderDescription(mount, bodyHtml, true);

  const card = document.createElement("div");
  mount.appendChild(card);

  let rows = [];
  try {
    if (figure.data) {
      rows = filterRows(await fetchCsv(figure.data), tab, figure, variantId, toggles);
      rows = figure.total?.annotation
        ? injectTotalAnnotation(spec, rows, figure)
        : applyTotal(rows, figure, toggles);
      applyToggleColor(spec, tab, figure, toggles, rows);
      if (figure.figureType === "table") {
        rows = dedupeHeaderLeaves(rows, spec);
        rows = groupContiguousRows(rows, spec);
      }
    }
    const opts = { spec, rows, downloadName: figure.id };
    const teardown = figure.figureType === "table"
      ? engine().mountTable(card, opts)
      : engine().mountChart(card, opts);
    if (typeof teardown === "function") teardowns.push(teardown);
    if (figure.figureType === "table" && figure.collapsible) {
      setupCollapsible(mount, card, figure, (fn) => teardowns.push(fn));
    }
  } catch (e) {
    console.error(e);
    card.innerHTML = `<div class="figure-error">Could not render: ${e.message}</div>`;
  }

  if (!figure.lead) renderDescription(mount, bodyHtml, false);
}

// Prose pane: an ordered list of cards — text cards (pre-rendered markdown, split at each
// `##` by the build) and table cards (mounted via the engine), interleaved in author order.
async function mountTableCard(card, def, fetchCsv) {
  try {
    const rows = def.data ? await fetchCsv(def.data) : [];
    const teardown = engine().mountTable(card, { spec: def.spec, rows });
    if (typeof teardown === "function") teardowns.push(teardown);
  } catch (e) {
    console.error(e);
    card.innerHTML = `<div class="figure-error">Could not render table: ${e.message}</div>`;
  }
}

export function renderProse(mount, ctx) {
  for (const t of teardowns) { try { t(); } catch { /* ignore */ } }
  teardowns = [];
  mount.innerHTML = "";

  const { figure, fetchCsv } = ctx;
  const wrap = document.createElement("div");
  wrap.className = "current-update"; // reuse prose card styling + outer-box suppression
  mount.appendChild(wrap);

  for (const block of (figure.blocks || [])) {
    const card = document.createElement("div");
    card.className = "current-update-card";
    wrap.appendChild(card);
    if (block.type === "text") {
      card.innerHTML = block.html || "";
    } else if (block.type === "table") {
      const def = (figure.tables || {})[block.table];
      if (!def) {
        card.innerHTML = `<div class="figure-error">Unknown table: ${block.table}</div>`;
        continue;
      }
      // Card is appended synchronously (order preserved); the table fills in when its CSV loads.
      mountTableCard(card, def, fetchCsv);
    }
  }
}

