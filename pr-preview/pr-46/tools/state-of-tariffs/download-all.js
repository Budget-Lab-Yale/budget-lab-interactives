/* ===========================================================================
 * download-all.js — bundle every dataset into one downloadable ZIP.
 *
 * Collects the unique CSV paths from the manifest (chart/table figures'
 * `data`, plus each prose pane's `tables[*].data`), fetches each, and packs
 * them — plus a generated README and citation — into a store-only ZIP
 * (see zip-store.js) nested under one date-stamped root folder.
 * =========================================================================== */

// Propagate the cache-bust version (stamped on this module's own URL by app.js) to the zip-store
// import, so a content-hash bump busts it too. Loaded lazily since it's only needed on download.
const ASSET_V = new URL(import.meta.url).searchParams.get("v") || "";
const loadZipStore = async () =>
  (await import(ASSET_V ? `./zip-store.js?v=${ASSET_V}` : "./zip-store.js")).zipStore;

const TOOL_TITLE = "State of Tariffs";
const TOOL_URL = "https://interactives.budgetlab.yale.edu/tools/state-of-tariffs/";

// Flatten a data path into the archive layout: a figure's default `data.csv`
// takes the bare figure slug; any other sheet keeps its name as a suffix.
//   default-scenario/real-gdp/data.csv       -> default-scenario/real-gdp.csv
//   statutory-rates/daily-rate-overall/data.csv -> statutory-rates/daily-rate-overall.csv
function flattenDataPath(p) {
  const parts = p.split("/");
  const file = parts.pop();
  const slug = parts.pop();
  const stem = file.replace(/\.csv$/i, "");
  const name = stem === "data" ? slug : `${slug}-${stem}`;
  return [...parts, `${name}.csv`].join("/");
}

// path -> { tab, name, source } for the first figure/table that references it.
function datasetInfo(manifest) {
  const map = new Map();
  const add = (path, info) => { if (path && !map.has(path)) map.set(path, info); };
  for (const tab of manifest.tabs || []) {
    for (const fig of tab.figures || []) {
      add(fig.data, { tab: tab.label, name: fig.short_label || fig.id, source: fig.spec?.source });
      for (const t of Object.values(fig.tables || {})) {
        add(t.data, { tab: tab.label, name: t.spec?.title || fig.short_label || fig.id, source: t.spec?.source });
      }
    }
  }
  return map;
}

function collectPaths(manifest) {
  return [...datasetInfo(manifest).keys()].sort();
}

function releaseDate(manifest) {
  const updated = manifest.release?.updated;
  if (updated) {
    const d = new Date(updated);
    if (!Number.isNaN(+d)) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function allDataStem(manifest) {
  return `state-of-tariffs_all-data_${releaseDate(manifest)}`;
}

function buildReadme(manifest) {
  const r = manifest.release || {};
  const info = datasetInfo(manifest);
  const out = [`# ${TOOL_TITLE} — Data`, "", `The Budget Lab at Yale — ${TOOL_URL}`, ""];
  if (r.updated) out.push(`Release: ${r.updated}`, "");
  out.push("Source data behind the figures in the Budget Lab's State of Tariffs interactive.", "", "## Datasets", "");
  const byTab = new Map();
  for (const [path, d] of info) {
    if (!byTab.has(d.tab)) byTab.set(d.tab, []);
    byTab.get(d.tab).push({ path, ...d });
  }
  for (const [tabLabel, items] of byTab) {
    out.push(`### ${tabLabel}`, "");
    items.sort((a, b) => a.path.localeCompare(b.path));
    for (const it of items) out.push(`- \`${flattenDataPath(it.path)}\` — ${it.name}.${it.source ? ` Source: ${it.source}` : ""}`);
    out.push("");
  }
  return out.join("\n");
}

function buildCitation(manifest) {
  const r = manifest.release || {};
  const iso = releaseDate(manifest);
  const year = iso.slice(0, 4);
  return [
    "How to cite", "",
    `The Budget Lab at Yale. "${TOOL_TITLE}."${r.updated ? ` ${r.updated}.` : ""} ${TOOL_URL}`, "",
    "BibTeX:", "",
    "@misc{budgetlab_state_of_tariffs,",
    "  author       = {{The Budget Lab at Yale}},",
    `  title        = {{${TOOL_TITLE}}},`,
    `  year         = {${year}},`,
    `  howpublished = {\\url{${TOOL_URL}}}`,
    "}", "",
  ].join("\n");
}

// Build the all-data ZIP. `fetchText(path)` returns a CSV's raw text given its
// manifest-relative path (the app's fetchCsvText). Only live-release datasets are included —
// archived vintages live in manifest.vintages, not manifest.tabs, so datasetInfo never sees them.
export async function buildAllDataZip(manifest, fetchText) {
  const stem = allDataStem(manifest);
  const files = [
    { name: `${stem}/README.md`, data: buildReadme(manifest) },
    { name: `${stem}/CITATION.txt`, data: buildCitation(manifest) },
  ];
  const paths = collectPaths(manifest);
  const texts = await Promise.all(paths.map(p => fetchText(p)));
  paths.forEach((p, i) => files.push({ name: `${stem}/${flattenDataPath(p)}`, data: texts[i] }));
  return (await loadZipStore())(files);
}

// --- Per-vintage bundle ----------------------------------------------------
// "Download this Vintage" packs one archived vintage's own data (all its scenarios). CSV paths in
// a vintage already point under previous-vintages/<date>/; we strip that prefix in the archive
// layout so the ZIP reads scenario/slug.csv.

export function vintageStem(vintage) {
  return `state-of-tariffs_${vintage.id || vintage.date}`;
}

// Datasets across a vintage's scenario tabs. Unlike the live datasetInfo this also walks composite
// `parts`, so an archived vintage's ZIP is complete.
function vintageDatasets(vintage) {
  const map = new Map();
  const add = (path, info) => { if (path && !map.has(path)) map.set(path, info); };
  for (const s of vintage.scenarios || []) {
    const tab = s.tab;
    if (!tab) continue;
    const group = s.label || tab.label;
    for (const fig of tab.figures || []) {
      const name = fig.short_label || fig.id;
      add(fig.data, { tab: group, name, source: fig.spec?.source });
      for (const p of fig.parts || []) add(p.data, { tab: group, name, source: p.spec?.source });
      for (const t of Object.values(fig.tables || {})) {
        add(t.data, { tab: group, name: t.spec?.title || name, source: t.spec?.source });
      }
    }
  }
  return map;
}

// Drop the "previous-vintages/<vintage-id>/" prefix, then flatten (scenario/slug.csv).
function vintageArchiveName(path) {
  return flattenDataPath(path.replace(/^previous-vintages\/[^/]+\//, ""));
}

function buildVintageReadme(vintage, info) {
  const out = [
    `# ${TOOL_TITLE} — Data (${vintage.label} vintage)`, "",
    `The Budget Lab at Yale — ${TOOL_URL}`, "",
    `Archived release: ${vintage.label}`, "",
    "Source data behind the figures in this archived vintage of the State of Tariffs interactive.",
    "", "## Datasets", "",
  ];
  const byTab = new Map();
  for (const [path, d] of info) {
    if (!byTab.has(d.tab)) byTab.set(d.tab, []);
    byTab.get(d.tab).push({ path, ...d });
  }
  for (const [tabLabel, items] of byTab) {
    out.push(`### ${tabLabel}`, "");
    items.sort((a, b) => a.path.localeCompare(b.path));
    for (const it of items) {
      out.push(`- \`${vintageArchiveName(it.path)}\` — ${it.name}.${it.source ? ` Source: ${it.source}` : ""}`);
    }
    out.push("");
  }
  return out.join("\n");
}

function buildVintageCitation(vintage) {
  const year = vintage.date.slice(0, 4);
  return [
    "How to cite", "",
    `The Budget Lab at Yale. "${TOOL_TITLE}." ${vintage.label}. ${TOOL_URL}`, "",
    "BibTeX:", "",
    "@misc{budgetlab_state_of_tariffs,",
    "  author       = {{The Budget Lab at Yale}},",
    `  title        = {{${TOOL_TITLE} (${vintage.label} vintage)}},`,
    `  year         = {${year}},`,
    `  howpublished = {\\url{${TOOL_URL}}}`,
    "}", "",
  ].join("\n");
}

// Build one vintage's data ZIP. `fetchText(path)` is the app's fetchCsvText (manifest-relative).
export async function buildVintageZip(vintage, fetchText) {
  const stem = vintageStem(vintage);
  const info = vintageDatasets(vintage);
  const paths = [...info.keys()].sort();
  const files = [
    { name: `${stem}/README.md`, data: buildVintageReadme(vintage, info) },
    { name: `${stem}/CITATION.txt`, data: buildVintageCitation(vintage) },
  ];
  const texts = await Promise.all(paths.map(p => fetchText(p)));
  paths.forEach((p, i) => files.push({ name: `${stem}/${vintageArchiveName(p)}`, data: texts[i] }));
  return (await loadZipStore())(files);
}
