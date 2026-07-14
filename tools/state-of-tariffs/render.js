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

function substituteTokens(str, labels, skip) {
  if (typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (m, key) =>
    (skip && skip.has(key)) ? m : (key in labels ? labels[key] : m));
}

// Shallow-merge a variant's spec overrides onto the base spec, then substitute {token}s in
// title/subtitle. Tokens bound to an inline title selector (spec.title_selectors) are LEFT in the
// title for the engine to render as an interactive dropdown — the tool substitutes everything else.
function resolveSpec(figure, variant, labels) {
  const spec = { ...figure.spec, ...(variant?.spec || {}) };
  const titleSelKeys = new Set(Object.keys(spec.title_selectors || {}));
  if (spec.title) spec.title = substituteTokens(spec.title, labels, titleSelKeys);
  if (spec.subtitle) spec.subtitle = substituteTokens(spec.subtitle, labels);
  return spec;
}

// State for a spec's inline title selectors: the active option id per key (from the sticky toggles
// map, else the selector's default), plus the active option's label — so row filtering, the
// engine's `selections`, and any {token} in prose all agree. Keys whose id matches a data column
// filter the rows to the active option (e.g. a `dimension` sector/country picker).
function titleSelectorState(spec, toggles) {
  const sels = (spec && spec.title_selectors) || {};
  const keys = Object.keys(sels);
  const selections = {};
  const labels = {};
  for (const k of keys) {
    const def = sels[k].default ?? sels[k].options?.[0]?.id;
    const active = toggles[k] != null ? toggles[k] : def;
    selections[k] = active;
    const opt = sels[k].options?.find(o => o.id === active);
    labels[k] = opt ? (opt.label ?? opt.id) : active;
  }
  return { keys, selections, labels };
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

// A tab-toggle option may carry overrides applied when it's active:
//   series_color — recolor every series to it (e.g. change-vs-default → violet), and/or
//   spec         — a shallow spec merge (e.g. a "Without China" option that swaps series_order
//                  and yAxisPolicy). Unlike variants, no `variant`-column row filter is involved.
// Clones the touched fields so the shared manifest spec isn't mutated across re-renders.
function applyToggleOverrides(spec, tab, figure, toggles, rows) {
  for (const t of tab.toggles || []) {
    if (t.applies_to_figures && !t.applies_to_figures.includes(figure.id)) continue;
    const active = toggles[t.id] ?? t.default;
    const opt = t.options?.find((o) => o.id === active);
    if (!opt) continue;
    if (opt.spec) Object.assign(spec, opt.spec);
    if (opt.series_color) {
      const scol = spec.columns?.series;
      const names = scol ? [...new Set(rows.map((r) => r[scol]))] : [""];
      spec.series_colors = { ...(spec.series_colors || {}) };
      for (const n of names) spec.series_colors[n] = opt.series_color;
    }
  }
}

// Render the total/aggregate rows as a reference-line ANNOTATION instead of a bar: the total's
// value is data-driven (varies by vintage/scenario), so the tool pulls the matching rows out of
// the data and sets a marker's value from each; everything else — label `{value}` substitution,
// `value_format`, `labelSide`, and per-pane `facet` scoping — is handled natively by the engine
// (chart engine ≥1.3.0). Horizontal bars → vertical rule on xAxis; vertical bars → horizontal
// rule on yAxis. Returns the non-total rows. figure.total.annotation is passed through verbatim
// (e.g. { label: "All households ({value})", value_format: {decimals:2,suffix:"%"}, style, color,
// labelSide }).
function injectTotalAnnotation(spec, rows, figure) {
  const t = figure.total;
  const isTotal = (r) => String(r[t.column]) === String(t.value);
  const totals = rows.filter(isTotal);
  if (!totals.length) return rows;

  const horizontal = spec.orientation === "horizontal";
  const axis = horizontal ? "xAxis" : "yAxis";
  const coord = horizontal ? "x" : "y";
  const valueCol = spec.columns?.value || "value";
  const facetCol = spec.columns?.facet;
  const a = t.annotation || {};

  // When a pane carries more than one total line — a real series dimension distinct from the pane
  // split, e.g. one line per scenario — color each line to match its series (from the pinned
  // series_colors) so the lines are distinguishable. A single line per pane keeps the annotation's
  // own (neutral) color.
  const seriesCol = spec.columns?.series;
  const perSeries = seriesCol && seriesCol !== facetCol
    && new Set(totals.map((r) => r[seriesCol])).size > 1
    && spec.series_colors;

  // Clone so we never accumulate into the shared manifest spec across re-renders.
  spec.annotations = { ...(spec.annotations || {}) };
  const list = [...(spec.annotations[axis] || [])];
  for (const tr of totals) {
    const v = Number(tr[valueCol]);
    if (!Number.isFinite(v)) continue;
    const line = { [coord]: v, ...a };
    // Faceted charts have per-pane scales; scope each line to its pane. The engine renders a
    // line in every pane when `facet` is omitted.
    if (facetCol && tr[facetCol] != null) line.facet = tr[facetCol];
    if (perSeries && spec.series_colors[tr[seriesCol]]) line.color = spec.series_colors[tr[seriesCol]];
    list.push(line);
  }
  spec.annotations[axis] = list;
  return rows.filter((r) => !isTotal(r));
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
  if (!figure.spec && !figure.parts) {
    mount.innerHTML = '<div class="figure-error">Figure has no spec.</div>';
    return;
  }

  const labels = tokenLabels(tab, figure, toggles);
  // Fold in inline title-selector active labels so {token}s in prose/subtitle resolve to them too
  // (the title itself keeps the {token} for the engine to render as a dropdown — see resolveSpec).
  for (const p of (figure.parts || [{ spec: figure.spec }])) {
    Object.assign(labels, titleSelectorState(p.spec, toggles).labels);
  }
  const variantId = figure.variants?.length ? pickActiveVariant(figure.variants, toggles, tab) : null;
  const variant = figure.variants?.find(v => v.id === variantId);

  // The description/lead prose supports the same {toggleId}/{selectorId} tokens as the
  // title/subtitle, so body copy updates with the active toggle too.
  const bodyHtml = substituteTokens(figure.body_html, labels);

  // Lead text renders above the figure card; a plain description renders below it (later).
  if (figure.lead) renderDescription(mount, bodyHtml, true);

  // A composite figure stacks several parts (e.g. a table then a chart); a plain figure is a
  // single implicit part. Each part shares the figure's selectors/variants/toggles for filtering
  // but carries its own engine spec, figureType, and total handling.
  const parts = figure.parts || [{
    figureType: figure.figureType, spec: figure.spec, data: figure.data,
    total: figure.total,
  }];

  for (const part of parts) {
    // A part-figure view: figure-level fields (id, selectors, variants) plus the part's own spec.
    const pf = {
      ...figure,
      figureType: part.figureType,
      spec: part.spec,
      data: part.data ?? figure.data,
      total: part.total,
    };
    const spec = resolveSpec(pf, variant, labels);
    // Inline title selectors (engine-rendered dropdowns bound to a {token} in the title). The
    // engine renders the control + recolors a single-series chart to the active option's color,
    // but plots the rows it's given — so the tool filters rows to the active option and re-renders
    // on change (ctx.onSelect → host state update → re-mount).
    const tss = titleSelectorState(spec, toggles);
    const card = document.createElement("div");
    card.className = "figure-part";
    mount.appendChild(card);
    try {
      let rows = [];
      if (pf.data) {
        rows = filterRows(await fetchCsv(pf.data), tab, pf, variantId, toggles);
        for (const k of tss.keys) {
          if (rows.length && Object.prototype.hasOwnProperty.call(rows[0], k)) {
            rows = rows.filter(r => r[k] === tss.selections[k]);
          }
        }
        rows = pf.total?.annotation
          ? injectTotalAnnotation(spec, rows, pf)
          : applyTotal(rows, pf, toggles);
        applyToggleOverrides(spec, tab, pf, toggles, rows);
        // series_order acts as a whitelist: draw only the series it names. By Product lists 7 of
        // its 22 product groups ("Selected Products"), and the "Without China" toggle swaps in a
        // China-less order — both expect the omitted series gone, not merely reordered. For charts
        // whose series_order already names every series this is a no-op. It also caps render load:
        // plotting all 22 product lines over daily data froze the main thread.
        const seriesCol = spec.columns?.series;
        if (seriesCol && Array.isArray(spec.series_order) && spec.series_order.length) {
          const allow = new Set(spec.series_order);
          rows = rows.filter(r => allow.has(r[seriesCol]));
        }
        // Multi-tier header keying, order-independent row grouping, collapsible row groups
        // (spec.collapsible), and single-facet bar hover (bar-end pill, not the legacy tooltip) are
        // all handled natively by the engine (≥1.3.1).
        // A facet channel that resolves to a single value isn't really a facet (gdp-by-category
        // "by trading partner" has one "Trading partners" group). Render it standalone so it doesn't
        // print a redundant single-value pane title (the engine now hovers it correctly either way).
        const facetCol = spec.columns?.facet;
        if (facetCol && rows.length && new Set(rows.map(r => r[facetCol])).size <= 1) {
          spec.columns = { ...spec.columns };
          delete spec.columns.facet;
          delete spec.small_multiples;
        }
      }
      const opts = { spec, rows, downloadName: figure.id };
      if (tss.keys.length) {
        opts.selections = tss.selections;
        if (ctx.onSelect) opts.onSelect = ctx.onSelect;
      }
      const teardown = pf.figureType === "table"
        ? engine().mountTable(card, opts)
        : engine().mountChart(card, opts);
      if (typeof teardown === "function") teardowns.push(teardown);
    } catch (e) {
      console.error(e);
      card.innerHTML = `<div class="figure-error">Could not render: ${e.message}</div>`;
    }
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

