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

// Filter rows by the active variant (the `variant` column) and by each
// single-select selector (a column named after the selector id).
function filterRows(rows, figure, variantId, toggles) {
  let out = rows;
  if (figure.variants?.length && variantId != null) {
    out = out.filter(r => r.variant === variantId);
  }
  for (const sel of figure.selectors || []) {
    const active = toggles[sel.id] ?? sel.default;
    out = out.filter(r => r[sel.id] === active);
  }
  return out;
}


function appendDescription(mount, body_html) {
  if (!body_html) return;
  const desc = document.createElement("div");
  desc.className = "figure-description";
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

  const card = document.createElement("div");
  mount.appendChild(card);

  let rows = [];
  try {
    if (figure.data) {
      rows = filterRows(await fetchCsv(figure.data), figure, variantId, toggles);
    }
    const opts = { spec, rows, downloadName: figure.id };
    const teardown = figure.figureType === "table"
      ? engine().mountTable(card, opts)
      : engine().mountChart(card, opts);
    if (typeof teardown === "function") teardowns.push(teardown);
  } catch (e) {
    console.error(e);
    card.innerHTML = `<div class="figure-error">Could not render: ${e.message}</div>`;
  }

  appendDescription(mount, figure.body_html);
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

