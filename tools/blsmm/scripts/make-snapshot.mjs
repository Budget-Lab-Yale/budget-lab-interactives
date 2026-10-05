#!/usr/bin/env node
// Freeze the current tool at versions/<date>/ (default: today), per
// CONTRIBUTING.md "When to snapshot a tool". Copies the runtime files and the
// vendored model and engine, then repoints the shared-asset paths, which sit
// two directories further up from a snapshot.
//
//   node scripts/make-snapshot.mjs [YYYY-MM-DD]
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const date = process.argv[2] || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Bad date: ${date}`);

const dest = path.join(TOOL, 'versions', date);
if (existsSync(dest)) throw new Error(`${path.relative(TOOL, dest)} already exists`);
mkdirSync(dest, { recursive: true });

const FILES = ['index.html', 'styles.css', 'app.js', 'inputs.js', 'format.js', 'results.js', 'charts.js',
  'builder.js', 'export.js', 'share.js', 'zip-store.js'];
for (const f of FILES) cpSync(path.join(TOOL, f), path.join(dest, f));
cpSync(path.join(TOOL, 'vendor'), path.join(dest, 'vendor'), { recursive: true });

const html = path.join(dest, 'index.html');
const before = readFileSync(html, 'utf8');
const after = before.replace(/"\.\.\/\.\.\/(assets|embed)\//g, '"../../../../$1/');
if (after === before) throw new Error('No shared-asset paths found to repoint in index.html');
writeFileSync(html, after);
console.log(`Snapshot written to ${path.relative(process.cwd(), dest)}`);
