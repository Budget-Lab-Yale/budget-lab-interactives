/* ===========================================================================
 * download-all.js — bundle every dataset into one downloadable ZIP.
 *
 * Collects the unique CSV paths from the manifest (chart/table figures'
 * `data`, plus each prose pane's `tables[*].data`), fetches each, and packs
 * them — plus a generated README and citation — into a store-only ZIP
 * (see zip-store.js) nested under one date-stamped root folder.
 * =========================================================================== */

import { zipStore } from "./zip-store.js";

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
  if (r.updated) out.push(`Release: ${r.updated}${r.version ? ` (version ${r.version})` : ""}`, "");
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
// manifest-relative path (the app's fetchCsvText).
export async function buildAllDataZip(manifest, fetchText) {
  const stem = allDataStem(manifest);
  const files = [
    { name: `${stem}/README.md`, data: buildReadme(manifest) },
    { name: `${stem}/CITATION.txt`, data: buildCitation(manifest) },
  ];
  const paths = collectPaths(manifest);
  const texts = await Promise.all(paths.map(p => fetchText(p)));
  paths.forEach((p, i) => files.push({ name: `${stem}/${flattenDataPath(p)}`, data: texts[i] }));
  return zipStore(files);
}
