/* ===========================================================================
 * AI Labor Market Tracker — state machine + manifest-driven UI.
 *
 * State lives in URLSearchParams so deep links survive iframe embeds and
 * page reloads. Three slots: tab, figure, toggles (encoded as key=value
 * pairs joined with commas under the `t` param).
 *
 * Chart rendering is delegated to renderFigure() in charts.js, which is
 * loaded lazily so the shell paints before the chart bundle arrives.
 * =========================================================================== */

import { buildAllDataZip, allDataStem } from "./download-all.js";

// The manifest itself always lives at a fixed bootstrap location; the data
// files it references are resolved against manifest.data_base_url (set at boot,
// falling back to ./data/). The manifest is the single source of truth for
// where data lives — see boot().
const MANIFEST_URL = "./data/manifest.json";
let dataBase = "./data/";

let manifest = null;
let chartsModule = null;       // lazily-loaded { renderFigure, renderCurrentUpdate }
const csvCache = new Map();     // url -> parsed rows
const csvTextCache = new Map(); // url -> raw CSV text (shared by parse + download)

// Tray-with-down-arrow glyph (matches the per-chart download buttons).
const DL_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
  '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
  'stroke-linejoin="round" d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10"/></svg>';

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
  if (tab.id === "current-update") return null;
  return tab.figures?.[0]?.id ?? null;
}

function figureById(tab, id) {
  return tab.figures?.find(f => f.id === id);
}

function defaultToggleValueFor(tab, figureKey, toggleId) {
  const toggle = tab.toggles?.find(t => t.id === toggleId);
  return toggle?.default ?? null;
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

// Trigger a browser download for a Blob. Revoke is deferred: a programmatic
// download starts asynchronously, and revoking in the same task can drop the
// file in some browsers.
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

// Client-side download of a data file's raw CSV text — backs each chart's
// "Data" button. Re-saves the full source CSV (all variants/industries),
// not the currently-filtered view.
async function downloadData(name, filename) {
  const text = await fetchCsvText(name);
  saveBlob(new Blob([text], { type: "text/csv;charset=utf-8" }), filename);
}

// Bundle every dataset (plus README + citation) into one ZIP — backs the
// "Download all data" button on the Current Update tab.
async function downloadAllData() {
  const blob = await buildAllDataZip(manifest, fetchCsvText);
  saveBlob(blob, `${allDataStem(manifest)}.zip`);
}

// Split one CSV line, honoring double-quoted fields that may contain commas
// (e.g. a series named "Trade, Transportation, and Utilities") and escaped
// quotes (""). Assumes no embedded newlines inside fields, which our data
// files don't use.
function parseCsvLine(line) {
  const out = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }  // escaped quote
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

// --- Rendering ------------------------------------------------------------

// Switch to a tab: reset to its default figure and toggle state. Shared by
// the desktop tab row and the mobile dropdown.
function switchTab(tabId) {
  const newTab = tabById(tabId);
  const defaultFig = defaultFigureForTab(newTab);
  const figObj = defaultFig ? figureById(newTab, defaultFig) : null;
  setState({
    tab: tabId,
    figure: defaultFig,
    toggles: {
      ...defaultTogglesFor(newTab),
      ...figureDefaultToggles(figObj),
    },
  });
}

function renderTabBar() {
  const nav = document.querySelector(".tracker-tabs");
  nav.innerHTML = "";

  // Desktop: a horizontal row of tab buttons (hidden ≤768px via CSS).
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

  // Mobile (≤768px via CSS): the tab row collapses to this dropdown. The
  // trigger shows the active tab; tapping reveals the full list.
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

function defaultTogglesFor(tab) {
  const out = {};
  for (const t of tab.toggles || []) {
    out[t.id] = t.default;
  }
  return out;
}

function renderSidebar() {
  const sidebar = document.querySelector(".tracker-sidebar");
  sidebar.innerHTML = "";
  const tab = tabById(state.tab);
  if (!tab) return;

  // Description / explainer for the tab — placed at the top of the
  // sidebar, above the figure selector.
  const explainer = document.createElement("div");
  explainer.className = "sidebar-explainer";

  if (tab.id === "current-update") {
    // Two stacked blocks: how-to text (with separator below), then
    // release metadata (no separator since it's last).
    explainer.innerHTML =
      `<p>Use the tabs above to move between the Tracker's three analytic sections. ` +
      `Within each tab, the list below selects which chart to view, and toggles ` +
      `(when present) switch between views of the same data.</p>`;
    sidebar.appendChild(explainer);

    const releaseInfo = manifest.release || {};
    const releaseEl = document.createElement("div");
    releaseEl.className = "sidebar-explainer is-standalone";
    releaseEl.innerHTML =
      `<p>Updated: ${escapeHtml(releaseInfo.updated || "")}</p>` +
      `<p>Version ${escapeHtml(releaseInfo.version || "")}</p>`;
    sidebar.appendChild(releaseEl);
    sidebar.appendChild(buildDownloadAllButton());
    return;
  }

  explainer.innerHTML = `<p>${escapeHtml(tab.description || "")}</p>`;
  sidebar.appendChild(explainer);

  // Figure list (vertical, with section headers when present)
  const figSection = document.createElement("div");
  figSection.className = "sidebar-section";
  const figHeading = document.createElement("h2");
  figHeading.textContent = "Figure";
  figSection.appendChild(figHeading);

  const figList = document.createElement("div");
  figList.className = "figure-list";
  figList.setAttribute("role", "tablist");
  figList.setAttribute("aria-label", "Figure");

  const sections = tab.sections || [];
  const figures = tab.figures || [];
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
      const groupHeader = document.createElement("div");
      groupHeader.className = "figure-list-section-heading";
      groupHeader.textContent = s.label;
      figList.appendChild(groupHeader);
      for (const f of items) {
        figList.appendChild(buildFigureListItem(f.id, f.short_label, f.figureNum));
      }
    }
    for (const f of unsectioned) {
      figList.appendChild(buildFigureListItem(f.id, f.short_label, f.figureNum));
    }
  } else {
    for (const f of figures) {
      figList.appendChild(buildFigureListItem(f.id, f.short_label, f.figureNum));
    }
  }

  figSection.appendChild(figList);
  sidebar.appendChild(figSection);

  // Toggles for this figure
  for (const toggle of tab.toggles || []) {
    if (toggle.applies_to_figures && !toggle.applies_to_figures.includes(state.figure)) continue;

    const tSec = document.createElement("div");
    tSec.className = "sidebar-section";
    const heading = document.createElement("h2");
    heading.textContent = toggle.label;
    tSec.appendChild(heading);

    const group = document.createElement("div");
    group.className = "toggle-group";
    group.role = "radiogroup";
    group.setAttribute("aria-label", toggle.label);

    for (const opt of toggle.options) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `toggle-${toggle.id}`;
      input.value = opt.id;
      input.checked = (state.toggles[toggle.id] || toggle.default) === opt.id;
      if (input.checked) label.classList.add("is-active");
      const txt = document.createElement("span");
      // Non-breaking hyphen (U+2011) for intra-word hyphens (e.g. "12-month")
      // so the term stays whole when the toggle label wraps to two lines.
      txt.textContent = opt.label.replace(/(\w)-(\w)/g, "$1‑$2");
      label.appendChild(input);
      label.appendChild(txt);
      input.addEventListener("change", () => {
        setState({ toggles: { ...state.toggles, [toggle.id]: opt.id } });
      });
      group.appendChild(label);
    }
    tSec.appendChild(group);
    sidebar.appendChild(tSec);
  }

  // Download-all-data button at the bottom of every tab's sidebar.
  sidebar.appendChild(buildDownloadAllButton());
}

// "Download All Data" button: bundles every dataset into a ZIP. Shown at the
// bottom of the sidebar on all tabs.
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

function buildFigureListItem(id, label, num) {
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
    // Switching figures resets figure-specific toggles (industry,
    // industries) to the new figure's defaults; tab-level toggles
    // (variant, panel) are preserved so the user's choice carries over.
    const tab = tabById(state.tab);
    const fig = figureById(tab, id);
    const figureDefaults = figureDefaultToggles(fig);
    setState({
      figure: id,
      toggles: { ...state.toggles, ...figureDefaults },
    });
  });
  return btn;
}

// Figure-level toggle defaults. Walks the figure's chart configs for any
// single-selector dimensions (today: F4's industry dropdown) and returns
// the URL-state toggle they expect.
function figureDefaultToggles(figure) {
  const out = {};
  for (const chart of (figure?.charts || [])) {
    for (const sel of (chart.selectors || [])) {
      if (sel.kind === "single" && sel.default != null) {
        out[sel.id] = sel.default;
      }
    }
  }
  return out;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function renderMain() {
  const main = document.getElementById("tracker-figure");
  main.innerHTML = '<div class="figure-loading">Loading&hellip;</div>';

  const tab = tabById(state.tab);
  if (!tab) {
    main.innerHTML = '<div class="figure-error">Unknown tab.</div>';
    return;
  }

  if (!chartsModule) {
    chartsModule = await import("./charts.js");
  }

  try {
    if (tab.id === "current-update") {
      chartsModule.renderCurrentUpdate(main, {
        body_html: tab.body_html,
      });
      return;
    }
    const fig = figureById(tab, state.figure);
    if (!fig) {
      main.innerHTML = '<div class="figure-error">Figure not found.</div>';
      return;
    }
    await chartsModule.renderFigure(main, {
      tab,
      figure: fig,
      toggles: state.toggles,
      fetchCsv,
      downloadData,
      // Inline selectors (industry dropdown / chip bar) update URL state
      // by patching the toggle map.
      updateToggle: (key, value) => {
        setState({ toggles: { ...state.toggles, [key]: value } });
      },
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
  let tabId = initial.tab && tabById(initial.tab) ? initial.tab : manifest.tabs[0].id;
  let tab = tabById(tabId);

  let figureId = initial.figure;
  const validFig = figureId && figureById(tab, figureId);
  if (!validFig) figureId = defaultFigureForTab(tab);

  const figObj = figureId ? figureById(tab, figureId) : null;
  let toggles = {
    ...defaultTogglesFor(tab),
    ...figureDefaultToggles(figObj),
    ...initial.toggles,
  };

  state.tab = tabId;
  state.figure = figureId;
  state.toggles = toggles;
  writeState(state);

  render();
}

boot().catch(err => {
  console.error("Failed to boot tracker:", err);
  document.getElementById("tracker-figure").innerHTML =
    `<div class="figure-error">Could not load tracker: ${err.message}</div>`;
});
