/* ===========================================================================
 * download-all.js — bundle every dataset into one downloadable ZIP.
 *
 * Collects the unique CSV paths from the manifest, fetches each, and packs
 * them (plus a generated README and citation) into a store-only ZIP that
 * mirrors the tool's data/ folder layout. Everything is nested under one
 * date-stamped root folder so the archive extracts cleanly.
 * =========================================================================== */

import { zipStore } from "./zip-store.js";

// Flatten a chart data path into the download layout: figure CSVs live
// directly in their tab folder, named for the figure slug rather than nested
// in a per-figure subfolder. The conventional default sheet (`data.csv`) takes
// the bare slug; any additional sheet keeps its name as a `-{sheet}` suffix so
// siblings stay unique.
//   occupational-churn/total-labor-force-recent/data.csv     -> occupational-churn/total-labor-force-recent.csv
//   occupational-churn/total-labor-force-recent/regional.csv -> occupational-churn/total-labor-force-recent-regional.csv
function flattenDataPath(p) {
  const parts = p.split("/");
  const file = parts.pop();
  const slug = parts.pop();
  const stem = file.replace(/\.csv$/i, "");
  const name = stem === "data" ? slug : `${slug}-${stem}`;
  return [...parts, `${name}.csv`].join("/");
}

// Unique CSV paths referenced by the manifest (SDID a/b charts share a file).
function collectPaths(manifest) {
  const seen = new Set();
  for (const tab of manifest.tabs || []) {
    for (const fig of tab.figures || []) {
      for (const chart of fig.charts || []) {
        if (chart.data) seen.add(chart.data);
      }
    }
  }
  return [...seen].sort();
}

// path → { tab, name, source } for the first figure that uses each CSV.
function datasetInfo(manifest) {
  const map = new Map();
  for (const tab of manifest.tabs || []) {
    for (const fig of tab.figures || []) {
      for (const chart of fig.charts || []) {
        if (!chart.data || map.has(chart.data)) continue;
        map.set(chart.data, { tab: tab.label, name: fig.short_label || fig.id, source: chart.source });
      }
    }
  }
  return map;
}

// ISO date (YYYY-MM-DD) from the manifest's release date, falling back to today.
function releaseDate(manifest) {
  const updated = manifest.release?.updated;
  if (updated) {
    const d = new Date(updated);
    if (!Number.isNaN(+d)) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function allDataStem(manifest) {
  return `ai-labor-market-tracker_all-data_${releaseDate(manifest)}`;
}

function buildReadme(manifest) {
  const r = manifest.release || {};
  const info = datasetInfo(manifest);
  const out = [];
  out.push("# AI Labor Market Tracker — Data");
  out.push("");
  out.push("The Budget Lab at Yale — https://budgetlab.yale.edu");
  out.push("");
  if (r.updated) out.push(`Release: ${r.updated}`);
  out.push("");
  out.push("This archive contains the source data behind all figures in the");
  out.push("Budget Lab's AI Labor Market Tracker, as well as crosswalks mapping");
  out.push("AI-exposure metrics to occupation codes.");
  out.push("");
  out.push("## Sections");
  out.push("");
  out.push("- occupational-churn/ — Occupational churn");
  out.push("- ai-metrics/         — AI exposure and usage metrics");
  out.push("- comparisons/        — Comparisons of AI-exposed and unexposed workers");
  out.push("- crosswalks/   — Mapping of AI-exposure metrics to occupation codes");
  out.push("");
  out.push("## Datasets");
  out.push("");
  const byTab = new Map();
  for (const [path, d] of info) {
    if (!byTab.has(d.tab)) byTab.set(d.tab, []);
    byTab.get(d.tab).push({ path, ...d });
  }
  for (const [tabLabel, items] of byTab) {
    out.push(`### ${tabLabel}`);
    out.push("");
    items.sort((a, b) => a.path.localeCompare(b.path));
    for (const it of items) out.push(`- \`${flattenDataPath(it.path)}\` — ${it.name}. Source: ${it.source || "n/a"}.`);
    out.push("");
  }
  const extra = manifest.additional_downloads;
  if (extra?.files?.length) {
    out.push(`### ${extra.label || "Crosswalks"}`);
    out.push("");
    for (const f of extra.files) {
      out.push(`- \`${f.path}\`${f.description ? ` — ${f.description}` : ""}`);
    }
    out.push("");
  }
  return out.join("\n");
}

const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function buildCitation(manifest) {
  const r = manifest.release || {};
  const url = "https://budgetlab.yale.edu/research/tracking-impact-ai-labor-market";
  const iso = releaseDate(manifest);
  const year = iso.slice(0, 4);
  const month = MONTH_ABBR[Number(iso.slice(5, 7)) - 1];
  const out = [];
  out.push("How to cite");
  out.push("");
  out.push(`The Budget Lab at Yale. "AI Labor Market Tracker."${r.updated ? ` ${r.updated}.` : ""} ${url}`);
  out.push("");
  out.push("BibTeX:");
  out.push("");
  out.push("@misc{budgetlab_ai_labor_market_tracker,");
  out.push("  author       = {{The Budget Lab at Yale}},");
  out.push("  title        = {{AI Labor Market Tracker}},");
  if (month) out.push(`  month        = {${month}},`);
  out.push(`  year         = {${year}},`);
  out.push(`  howpublished = {\\url{${url}}}`);
  out.push("}");
  out.push("");
  return out.join("\n");
}

// Build the all-data ZIP. `fetchText(path)` returns the raw text of a CSV
// given its manifest-relative path (e.g. the app's fetchCsvText).
export async function buildAllDataZip(manifest, fetchText) {
  const stem = allDataStem(manifest);
  const files = [
    { name: `${stem}/README.md`, data: buildReadme(manifest) },
    { name: `${stem}/CITATION.txt`, data: buildCitation(manifest) },
  ];
  const paths = collectPaths(manifest);
  const texts = await Promise.all(paths.map(p => fetchText(p)));
  paths.forEach((p, i) => files.push({ name: `${stem}/${flattenDataPath(p)}`, data: texts[i] }));

  // Download-only data (e.g. crosswalks) not tied to any chart.
  const extra = manifest.additional_downloads;
  if (extra?.files?.length) {
    const extraPaths = extra.files.map(f => f.path);
    const extraTexts = await Promise.all(extraPaths.map(p => fetchText(p)));
    extraPaths.forEach((p, i) => files.push({ name: `${stem}/${p}`, data: extraTexts[i] }));
  }
  return zipStore(files);
}
