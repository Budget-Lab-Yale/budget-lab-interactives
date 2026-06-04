// Verifies that every local (non-external) reference in the repo's HTML files
// resolves to a file that actually exists on disk. Catches the most common
// way a change breaks the published site: a wrong relative path (e.g. a
// version-snapshot's "../../../../assets/..." pointing at the wrong depth, or
// a moved asset). External refs (http(s), //, mailto, data, #fragments) are
// skipped. Directory refs like "tools/foo/" are satisfied by an index.html.
//
// Zero dependencies; run with `node .github/scripts/check-links.mjs` from the
// repo root. Exits non-zero (and lists every broken ref) if any don't resolve.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const ROOT = process.cwd();
const IGNORE = new Set(['.git', 'node_modules']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.toLowerCase().endsWith('.html')) out.push(p);
  }
  return out;
}

const attrRe = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const broken = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const html = readFileSync(file, 'utf8');
  let m;
  while ((m = attrRe.exec(html))) {
    const raw = m[1].trim();
    // Skip anything that isn't a local file reference.
    if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(raw)) continue; // //host, http://, https://
    if (/^(?:mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    if (raw.startsWith('#')) continue;

    const ref = raw.split('#')[0].split('?')[0];
    if (!ref) continue;

    const target = ref.startsWith('/') ? join(ROOT, ref) : resolve(dirname(file), ref);
    checked++;

    if (!existsSync(target)) {
      broken.push(`${relative(ROOT, file)}  ->  ${raw}`);
      continue;
    }
    if (statSync(target).isDirectory() && !existsSync(join(target, 'index.html'))) {
      broken.push(`${relative(ROOT, file)}  ->  ${raw}  (directory has no index.html)`);
    }
  }
}

if (broken.length) {
  console.error(`Broken local references (${broken.length}):\n` + broken.map((b) => '  ' + b).join('\n'));
  process.exit(1);
}
console.log(`All ${checked} local references resolve.`);
