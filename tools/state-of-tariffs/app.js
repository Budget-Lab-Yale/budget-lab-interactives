/* ===========================================================================
 * State of Tariffs — state machine + manifest-driven UI.
 *
 * Mirrors the AI Labor Market Tracker's shell: state lives in URLSearchParams
 * so deep links survive iframe embeds and reloads. Slots: tab, figure, and a
 * `toggles` map (tab toggles + figure selectors, encoded as key=value pairs
 * joined with commas under the `t` param).
 *
 * Figure rendering is delegated to render.js, which calls the vendored chart
 * engine (window.BudgetLabChart). render.js is imported lazily so the shell
 * paints before the (large) engine bundle is exercised.
 * =========================================================================== */

import { buildAllDataZip, allDataStem } from "./download-all.js";

const MANIFEST_URL = "./data/manifest.json";
let dataBase = "./data/";

// Tray-with-down-arrow glyph for the Download All Data button.
const DL_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
  '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
  'stroke-linejoin="round" d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10"/></svg>';

let manifest = null;
let renderModule = null;          // lazily-loaded { renderFigure, renderProse }
const csvCache = new Map();       // url -> parsed rows
const csvTextCache = new Map();   // url -> raw CSV text (shared by parse + download)

// --- URL state ------------------------------------------------------------

function readState() {
  const p = new URLSearchParams(window.location.search);
  const toggles = {};
  const t = p.get("t");
  if (t) {
    for (const pair of t.split(",")) {
      const [k, v] = pair.split("=");
      if (k && v) toggles[k] = v;
    }
  }
  return {
    tab: p.get("tab") || null,
    figure: p.get("figure") || null,
    toggles,
  };
}

function writeState(state) {
  const p = new URLSearchParams();
  if (state.tab) p.set("tab", state.tab);
  if (state.figure) p.set("figure", state.figure);
  const togglePairs = Object.entries(state.toggles || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${v}`);
  if (togglePairs.length) p.set("t", togglePairs.join(","));
  const qs = p.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  history.replaceState(null, "", url);
}

const state = { tab: null, figure: null, toggles: {} };

function setState(patch, opts = { rerender: true }) {
  Object.assign(state, patch);
  writeState(state);
  if (opts.rerender) render();
}

// --- Manifest helpers -----------------------------------------------------

function tabById(id) { return manifest.tabs.find(t => t.id === id); }

function defaultFigureForTab(tab) {
  return tab.figures?.[0]?.id ?? null;
}

function figureById(tab, id) {
  return tab.figures?.find(f => f.id === id);
}

// --- CSV fetching ---------------------------------------------------------

async function fetchCsvText(name) {
  const url = dataBase + name;
  if (csvTextCache.has(url)) return csvTextCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`);
  const text = await res.text();
  csvTextCache.set(url, text);
  return text;
}

async function fetchCsv(name) {
  const url = dataBase + name;
  if (csvCache.has(url)) return csvCache.get(url);
  const rows = parseCsv(await fetchCsvText(name));
  csvCache.set(url, rows);
  return rows;
}

// Split one CSV line, honoring double-quoted fields (commas inside quotes,
// escaped "" quotes). No embedded newlines inside fields.
function parseCsvLine(line) {
  const out = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

// Parse CSV into an array of string-keyed row objects — exactly the TidyRow
// shape the chart engine expects (it coerces numbers itself).
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
    return obj;
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Bundle every dataset (plus README + citation) into one ZIP — backs the
// "Download All Data" button in the sidebar.
async function downloadAllData() {
  const blob = await buildAllDataZip(manifest, fetchCsvText);
  saveBlob(blob, `${allDataStem(manifest)}.zip`);
}

// --- Toggle / selector defaults -------------------------------------------

function defaultTogglesFor(tab) {
  const out = {};
  for (const t of tab.toggles || []) out[t.id] = t.default;
  return out;
}

// Figure-level selector defaults (e.g. a sector/country dropdown) and inline title-selector
// defaults (engine-rendered dropdowns declared in spec.title_selectors). Both live in the same
// sticky toggles map keyed by the selector id, so filtering + deep-link state treat them alike.
function figureDefaultToggles(figure) {
  const out = {};
  for (const sel of (figure?.selectors || [])) {
    if (sel.default != null) out[sel.id] = sel.default;
  }
  const specs = figure?.parts ? figure.parts.map(p => p.spec) : [figure?.spec];
  for (const spec of specs) {
    const sels = (spec && spec.title_selectors) || {};
    for (const k of Object.keys(sels)) {
      out[k] = sels[k].default ?? sels[k].options?.[0]?.id;
    }
  }
  return out;
}

// --- Rendering: tab bar ---------------------------------------------------

function switchTab(tabId) {
  const newTab = tabById(tabId);
  const defaultFig = defaultFigureForTab(newTab);
  const figObj = defaultFig ? figureById(newTab, defaultFig) : null;
  setState({
    tab: tabId,
    figure: defaultFig,
    toggles: { ...defaultTogglesFor(newTab), ...figureDefaultToggles(figObj) },
  });
}

function renderTabBar() {
  const nav = document.querySelector(".tracker-tabs");
  nav.innerHTML = "";

  for (const tab of manifest.tabs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.role = "tab";
    btn.className = "tracker-tab";
    btn.textContent = tab.label;
    btn.setAttribute("aria-selected", String(tab.id === state.tab));
    btn.addEventListener("click", () => switchTab(tab.id));
    nav.appendChild(btn);
  }

  // Mobile dropdown (shown ≤880px via CSS).
  const menu = document.createElement("div");
  menu.className = "tracker-tabs-menu";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "tracker-tabs-trigger";
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  const activeLabel = document.createElement("span");
  activeLabel.textContent = tabById(state.tab)?.label || "";
  const caret = document.createElement("span");
  caret.className = "tracker-tabs-caret";
  caret.textContent = "▾";
  caret.setAttribute("aria-hidden", "true");
  trigger.append(activeLabel, caret);

  const list = document.createElement("div");
  list.className = "tracker-tabs-list";
  list.setAttribute("role", "menu");
  list.hidden = true;

  const closeMenu = () => {
    list.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onAway);
  };
  const onAway = (e) => { if (!menu.contains(e.target)) closeMenu(); };
  const openMenu = () => {
    list.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    setTimeout(() => document.addEventListener("click", onAway), 0);
  };

  for (const tab of manifest.tabs) {
    const item = document.createElement("button");
    item.type = "button";
    item.setAttribute("role", "menuitem");
    item.textContent = tab.label;
    if (tab.id === state.tab) item.classList.add("is-active");
    item.addEventListener("click", () => { closeMenu(); switchTab(tab.id); });
    list.appendChild(item);
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    list.hidden ? openMenu() : closeMenu();
  });
  trigger.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  menu.append(trigger, list);
  nav.appendChild(menu);
}

// --- Rendering: sidebar ---------------------------------------------------

function renderSidebar() {
  const sidebar = document.querySelector(".tracker-sidebar");
  sidebar.innerHTML = "";
  const tab = tabById(state.tab);
  if (!tab) return;

  const sections = tab.sections || [];
  const figures = tab.figures || [];
  const hasFigureList = figures.length > 1;

  const explainer = document.createElement("div");
  // `is-standalone` drops the explainer's divider when no figure list follows, so it doesn't
  // stack with the release block's top border into a double rule.
  explainer.className = "sidebar-explainer" + (hasFigureList ? "" : " is-standalone");
  explainer.innerHTML = `<p>${escapeHtml(tab.description || "")}</p>`;
  sidebar.appendChild(explainer);

  // Figure list (vertical, with section headers when present). Suppressed on tabs with a
  // single figure (e.g. a prose-only tab) — there's nothing to pick between.
  if (hasFigureList) {
    const figSection = document.createElement("div");
    figSection.className = "sidebar-section";

    const figList = document.createElement("div");
    figList.className = "figure-list";
    figList.setAttribute("role", "tablist");
    figList.setAttribute("aria-label", "Figure");

    if (sections.length) {
      const bySection = new Map(sections.map(s => [s.id, []]));
      const unsectioned = [];
      for (const f of figures) {
        if (f.section && bySection.has(f.section)) bySection.get(f.section).push(f);
        else unsectioned.push(f);
      }
      for (const s of sections) {
        const items = bySection.get(s.id);
        if (!items.length) continue;
        // A section with no label renders its figures with no heading (e.g. the Summary pane).
        if (s.label) {
          const groupHeader = document.createElement("div");
          groupHeader.className = "figure-list-section-heading";
          groupHeader.textContent = s.label;
          figList.appendChild(groupHeader);
        }
        for (const f of items) figList.appendChild(buildFigureListItem(f));
      }
      for (const f of unsectioned) figList.appendChild(buildFigureListItem(f));
    } else {
      for (const f of figures) figList.appendChild(buildFigureListItem(f));
    }

    figSection.appendChild(figList);
    sidebar.appendChild(figSection);
  }

  const fig = figureById(tab, state.figure);
  const toggleApplies = (t) => !t.applies_to_figures || t.applies_to_figures.includes(state.figure);

  // Tab-level toggles that apply to the active figure. By default they render ABOVE the figure's
  // selectors; a toggle flagged `after_selectors` renders below them instead.
  for (const toggle of (tab.toggles || [])) {
    if (toggleApplies(toggle) && !toggle.after_selectors) sidebar.appendChild(buildToggleSection(toggle));
  }

  // Figure-level selectors (sidebar dropdowns).
  for (const sel of (fig?.selectors || [])) {
    sidebar.appendChild(buildSelectorSection(sel));
  }

  // Toggles explicitly placed below the selectors (e.g. a China on/off refinement under the
  // scenario picker).
  for (const toggle of (tab.toggles || [])) {
    if (toggleApplies(toggle) && toggle.after_selectors) sidebar.appendChild(buildToggleSection(toggle));
  }

  // Release metadata (updated date + version) — shown on every tab.
  {
    const r = manifest.release || {};
    const rel = document.createElement("div");
    rel.className = "sidebar-release";
    rel.innerHTML =
      `<p>Updated: ${escapeHtml(r.updated || "")}</p>` +
      `<p>Version ${escapeHtml(r.version || "")}</p>`;
    sidebar.appendChild(rel);
  }

  // Download All Data — on every tab.
  sidebar.appendChild(buildDownloadAllButton());
}

function buildDownloadAllButton() {
  const wrap = document.createElement("div");
  wrap.className = "sidebar-download";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sidebar-download-btn";
  btn.innerHTML = `${DL_ICON}<span>Download All Data</span>`;
  const label = btn.querySelector("span");
  btn.addEventListener("click", async () => {
    if (btn.disabled) return;
    const original = label.textContent;
    btn.disabled = true;
    label.textContent = "Preparing…";
    try {
      await downloadAllData();
      label.textContent = original;
    } catch (err) {
      console.error("Download all data failed:", err);
      label.textContent = "Failed";
      setTimeout(() => { label.textContent = original; }, 2000);
    } finally {
      btn.disabled = false;
    }
  });
  wrap.appendChild(btn);
  return wrap;
}

// A segmented pill control (styled radio group): the shared rendering for tab toggles and for
// binary selectors. `stateKey` is the toggles-map key; `activeValue` the current option id.
function buildSegmentedGroup(stateKey, label, options, activeValue) {
  const group = document.createElement("div");
  group.className = "toggle-group";
  group.role = "radiogroup";
  group.setAttribute("aria-label", label);
  for (const opt of options) {
    const lab = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `toggle-${stateKey}`;
    input.value = opt.id;
    input.checked = activeValue === opt.id;
    if (input.checked) lab.classList.add("is-active");
    const txt = document.createElement("span");
    // Non-breaking hyphen so terms like "12-month" stay whole on wrap.
    txt.textContent = opt.label.replace(/(\w)-(\w)/g, "$1‑$2");
    lab.append(input, txt);
    input.addEventListener("change", () => {
      setState({ toggles: { ...state.toggles, [stateKey]: opt.id } });
    });
    group.appendChild(lab);
  }
  return group;
}

function buildToggleSection(toggle) {
  const sec = document.createElement("div");
  sec.className = "sidebar-section";
  const heading = document.createElement("h2");
  heading.textContent = toggle.label;
  sec.appendChild(heading);
  sec.appendChild(
    buildSegmentedGroup(toggle.id, toggle.label, toggle.options, state.toggles[toggle.id] || toggle.default),
  );
  return sec;
}

function buildSelectorSection(sel) {
  const sec = document.createElement("div");
  sec.className = "sidebar-section";
  const heading = document.createElement("h2");
  heading.textContent = sel.label || sel.id;
  sec.appendChild(heading);

  const active = state.toggles[sel.id] || sel.default;

  // Binary selector → segmented pill control (same as a tab toggle); 3+ options → dropdown.
  if ((sel.options || []).length === 2) {
    sec.appendChild(buildSegmentedGroup(sel.id, sel.label || sel.id, sel.options, active));
    return sec;
  }

  const select = document.createElement("select");
  select.className = "sidebar-select";
  select.setAttribute("aria-label", sel.label || sel.id);
  for (const opt of sel.options) {
    const o = document.createElement("option");
    o.value = opt.id;
    o.textContent = opt.label;
    if (opt.id === active) o.selected = true;
    select.appendChild(o);
  }
  select.addEventListener("change", () => {
    setState({ toggles: { ...state.toggles, [sel.id]: select.value } });
  });
  sec.appendChild(select);
  return sec;
}

function buildFigureListItem(figure) {
  const { id, short_label: label, figureNum: num } = figure;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "figure-list-item";
  btn.setAttribute("role", "tab");
  btn.dataset.figureId = id;
  if (id === state.figure) {
    btn.classList.add("is-active");
    btn.setAttribute("aria-selected", "true");
  } else {
    btn.setAttribute("aria-selected", "false");
  }

  if (num != null) {
    const numEl = document.createElement("span");
    numEl.className = "figure-list-num";
    numEl.textContent = String(num);
    numEl.setAttribute("aria-hidden", "true");
    btn.appendChild(numEl);
  }
  const labelEl = document.createElement("span");
  labelEl.className = "figure-list-label";
  labelEl.textContent = label;
  btn.appendChild(labelEl);

  btn.addEventListener("click", () => {
    // Switching figures resets the new figure's selector defaults; tab-level
    // toggles are preserved so the user's choice carries over.
    setState({
      figure: id,
      toggles: { ...state.toggles, ...figureDefaultToggles(figure) },
    });
  });
  return btn;
}

// --- Rendering: main ------------------------------------------------------

async function renderMain() {
  const main = document.getElementById("tracker-figure");
  main.innerHTML = '<div class="figure-loading">Loading&hellip;</div>';

  const tab = tabById(state.tab);
  if (!tab) {
    main.innerHTML = '<div class="figure-error">Unknown tab.</div>';
    return;
  }

  if (!renderModule) renderModule = await import("./render.js");

  try {
    const fig = figureById(tab, state.figure);
    if (!fig) {
      main.innerHTML = '<div class="figure-error">Figure not found.</div>';
      return;
    }
    if (fig.figureType === "prose") {
      renderModule.renderProse(main, { figure: fig, fetchCsv });
      return;
    }
    await renderModule.renderFigure(main, {
      tab,
      figure: fig,
      toggles: state.toggles,
      fetchCsv,
      // An inline title selector changed: update the sticky toggles map (keyed by the selector id)
      // and re-render so the tool re-filters rows to the new option.
      onSelect: ({ id, value }) => setState({ toggles: { ...state.toggles, [id]: value } }),
    });
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="figure-error">Could not render figure: ${escapeHtml(err.message)}</div>`;
  }
}

function render() {
  renderTabBar();
  renderSidebar();
  renderMain();
}

// --- Boot -----------------------------------------------------------------

async function boot() {
  const res = await fetch(MANIFEST_URL);
  manifest = await res.json();
  dataBase = manifest.data_base_url || "./data/";

  const initial = readState();
  const tabId = initial.tab && tabById(initial.tab) ? initial.tab : manifest.tabs[0].id;
  const tab = tabById(tabId);

  let figureId = initial.figure;
  if (!(figureId && figureById(tab, figureId))) figureId = defaultFigureForTab(tab);
  const figObj = figureId ? figureById(tab, figureId) : null;

  state.tab = tabId;
  state.figure = figureId;
  state.toggles = {
    ...defaultTogglesFor(tab),
    ...figureDefaultToggles(figObj),
    ...initial.toggles,
  };
  writeState(state);

  render();
}

boot().catch(err => {
  console.error("Failed to boot State of Tariffs:", err);
  document.getElementById("tracker-figure").innerHTML =
    `<div class="figure-error">Could not load tool: ${err.message}</div>`;
});
