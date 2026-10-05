#!/usr/bin/env node
// Cache-busting for the BLSMM tool. Stamps ?v=<hash> on styles.css and app.js
// in index.html and on every relative module import, so a deploy never mixes
// a fresh app.js with a cached older module. The hash covers every runtime
// file, with the stamps themselves stripped so it is stable.
//
//   node scripts/stamp-assets.mjs           rewrite the stamps
//   node scripts/stamp-assets.mjs --check   exit 1 if any stamp is stale (CI)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['app.js', 'inputs.js', 'format.js', 'results.js', 'charts.js', 'builder.js', 'export.js', 'share.js', 'zip-store.js'];
const HASHED = [...MODULES, 'styles.css', 'vendor/blsmm-model/blsmm-model.js', 'vendor/blsmm-model/model-data.json'];
const STAMP = /\?v=[0-9a-f]{10}/g;

const read = (f) => readFileSync(path.join(TOOL, f), 'utf8').replace(/\r/g, '');
const hash = createHash('sha256');
for (const f of HASHED) hash.update(`${f}\n${read(f).replace(STAMP, '')}\n`);
const v = hash.digest('hex').slice(0, 10);

const rewrites = {
  'index.html': (s) => s
    .replace(/href="styles\.css(\?v=[0-9a-f]{10})?"/, `href="styles.css?v=${v}"`)
    .replace(/src="app\.js(\?v=[0-9a-f]{10})?"/, `src="app.js?v=${v}"`),
};
for (const m of MODULES) {
  rewrites[m] = (s) => s.replace(/(from\s+'|import\(\s*')(\.\/[^'?]+\.js)(\?v=[0-9a-f]{10})?'/g, `$1$2?v=${v}'`);
}

const check = process.argv.includes('--check');
const stale = [];
for (const [f, fn] of Object.entries(rewrites)) {
  const before = readFileSync(path.join(TOOL, f), 'utf8');
  const after = fn(before);
  if (after === before) continue;
  stale.push(f);
  if (!check) writeFileSync(path.join(TOOL, f), after);
}
if (check && stale.length) {
  console.error(`::error::BLSMM asset stamps are stale in: ${stale.join(', ')} (expected ?v=${v}).`);
  console.error('Run: node tools/blsmm/scripts/stamp-assets.mjs  and commit the result.');
  process.exit(1);
}
console.log(check ? `blsmm: asset stamps OK (?v=${v})` : `blsmm: stamped ?v=${v}${stale.length ? ` in ${stale.join(', ')}` : ''}`);
