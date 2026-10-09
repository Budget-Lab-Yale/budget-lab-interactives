// tools/taxes-at-the-top/test/stack-columns.test.mjs
//
// The stack figure's column heads ("Dollars" over the dollar column, "% GDP" over
// the share column, nothing over the step lane between them) on the hover card
// and the export image, and the export's text weights against the screen's.
//
// The weights test reads styles.css rather than restating its values: the export
// re-renders from data rather than serialising the DOM, so nothing else keeps a
// weight changed on screen from silently diverging in the downloaded PNG.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModel } from '../model.js';
import { tipCard } from '../render/shared.js';
import { layoutStack, buildStackExportSvg, segTipCfg, COL_HEADS, RUNGS, SCORE_RUNG } from '../render/stack.js';

const DATA = JSON.parse(readFileSync(new URL('../data/data.json', import.meta.url)));
const GDP0 = DATA.meta.gdp_fy_decades[0];
const EX_OPTS = { decadeLabel: 'FY2027–36', dialSubtitles: {}, title: 'Test figure title' };
const STYLES = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const ENGINE_CSS = readFileSync(new URL('../vendor/chart-engine/chart-engine.css', import.meta.url), 'utf8');

const model = createModel(DATA);
const layout = layoutStack(model.stackMarginals({ ord: { rate: 45 } }, ['ord'], 0), GDP0);
const svg = buildStackExportSvg(layout, GDP0, { ...EX_OPTS, dialSubtitles: { ord: 'top rate 45%' } });

function texts(markup) {
  return [...markup.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
    attrs: m[1],
    body: m[2],
    x: +(/ x="([^"]+)"/.exec(' ' + m[1]) || [])[1],
    size: +(/font-size="([^"]+)"/.exec(m[1]) || [])[1],
    weight: +(/font-weight="([^"]+)"/.exec(m[1]) || [])[1]
  }));
}
const T = texts(svg);
const one = (pred, what) => {
  const hits = T.filter(pred);
  assert.ok(hits.length >= 1, 'export has no ' + what);
  return hits;
};

test('hover card heads its dollar and share lanes, and only the stack card does', () => {
  const row = { key: 'ord', stat: { iit: 10 }, mech: { iit: 9 }, conv: { iit: 8 } };
  const cfg = segTipCfg('iit', 8, SCORE_RUNG, row, GDP0, 'FY2027–36');
  assert.deepEqual(cfg.cols, { alt: 'Dollars', value: '% GDP' });

  const html = tipCard(cfg);
  assert.ok(html.includes('tt-rows has-cols'), 'rows block not marked as headed');
  const head = /<div class="tbl-tooltip-row is-colhead">(.*?)<\/div>/.exec(html);
  assert.ok(head, 'no column-head row');
  assert.ok(head[1].includes('<span class="tt-alt">Dollars</span><span class="tbl-tooltip-value">% GDP</span>'),
    'heads not in the alt/value lanes, in that order');
  assert.ok(html.indexOf('is-colhead') < html.indexOf(RUNGS[0].label), 'head row must precede the rung rows');

  // The distribution views share tipCard and pass no `cols`.
  const bare = tipCard({ rows: [{ label: 'L', alt: '$1B', value: '1%' }] });
  assert.ok(!bare.includes('is-colhead') && !bare.includes('has-cols'));
});

test('export image heads the dollar and share columns at their right edges', () => {
  const dollarsHead = one((t) => t.body === COL_HEADS.dollars, 'Dollars head')[0];
  const shareHead = one((t) => t.body === COL_HEADS.share, '% GDP head')[0];
  const dollarCells = one((t) => /^-?\$/.test(t.body), 'dollar cells');
  const shareCells = one((t) => /^-?\d+\.\d\d%$/.test(t.body) && t.size !== 9.5 && /text-anchor="end"/.test(t.attrs), 'share cells');
  assert.ok(dollarCells.every((t) => t.x === dollarsHead.x), 'Dollars head off its column');
  assert.ok(shareCells.every((t) => t.x === shareHead.x), '% GDP head off its column');
  for (const h of [dollarsHead, shareHead]) assert.ok(/text-anchor="end"/.test(h.attrs));
  // Nothing heads the step lane.
  assert.equal(T.filter((t) => t.body === COL_HEADS.dollars || t.body === COL_HEADS.share).length, 2);
});

test('every export text names its weight (an SVG default of 400 is below the page body weight)', () => {
  const missing = T.filter((t) => !t.weight);
  assert.deepEqual(missing.map((t) => t.body), []);
  assert.ok(!/<text(?![^>]*font-weight)[^>]*>/.test(svg));
});

// The screen's weight for one rule, resolved through styles.css's --tw-* scale.
// A `font:` shorthand that names no weight resets it to normal (400).
function cssWeight(css, selector) {
  const start = css.indexOf('\n' + selector + ' {');
  assert.ok(start >= 0, 'no rule for ' + selector);
  const block = css.slice(start, css.indexOf('}', start));
  const m = /font-weight:\s*([^;]+);/.exec(block) || /font:\s*(\S+)/.exec(block);
  assert.ok(m, selector + ' sets no weight');
  const v = m[1].trim();
  if (!/^(var\(--tw-[a-z]+\)|\d{3})$/.test(v)) return 400;
  const tok = /^var\((--tw-[a-z]+)\)$/.exec(v);
  if (!tok) return +v;
  const def = new RegExp(tok[1] + ':\\s*(\\d+)').exec(css);
  assert.ok(def, 'undefined token ' + tok[1]);
  return +def[1];
}

test('export text weights match the screen rules for the same text', () => {
  const policy = 'Top ordinary rate';
  const scoreShares = one((t) => t.size === 13.5, 'score shares');       // policy row, then total
  const scoreDollars = one((t) => t.size === 11.5, 'score dollars');
  const cases = [
    ['.mname', one((t) => t.body === policy, 'policy name')[0]],
    ['.mrow.total .mname', one((t) => t.body === 'Whole package', 'total name')[0]],
    ['.mtag .tconv', one((t) => t.body === SCORE_RUNG.tag, 'score tag')[0]],
    ['.mnum .is-conv .lv', scoreShares[0]],
    ['.mrow.total .mnum .is-conv .lv', scoreShares[scoreShares.length - 1]],
    ['.mrow.total .mdol .d-conv', scoreDollars[scoreDollars.length - 1]],
    ['.mrow.colhead .mdol > div, .mrow.colhead .mnum .lv', one((t) => t.body === COL_HEADS.dollars, 'Dollars head')[0]]
  ];
  for (const [sel, t] of cases) {
    assert.equal(t.weight, cssWeight(STYLES, sel), sel + ' vs export "' + t.body + '"');
  }
  // Text the screen leaves at the body weight stays there in the export.
  assert.equal(scoreDollars[0].weight, cssWeight(STYLES, 'body'), 'policy-row score dollars');
  // The settings line and the two lighter rung tags set `font:` without a weight.
  assert.equal(one((t) => t.body === 'top rate 45%', 'settings line')[0].weight, cssWeight(STYLES, '.msub'));
  for (const u of RUNGS.slice(0, 2)) {
    assert.equal(one((t) => t.body === u.tag, u.tag + ' tag')[0].weight, cssWeight(STYLES, '.mtag span'), u.tag);
  }
});

test('export embeds the font it names, when the page supplies it', () => {
  // embeddedFontCss() lifts this rule from the live page; if the vendored engine
  // stops shipping Figtree as a data URI, the PNG drops back to the system face.
  assert.match(ENGINE_CSS, /@font-face\{font-family:'Figtree';src:url\(data:font\/ttf;base64,/);
  assert.ok(!svg.includes('<style'), 'no font CSS passed, so none embedded');
  const css = "@font-face { font-family: Figtree; src: url(data:font/ttf;base64,AAAA); }";
  const withFont = buildStackExportSvg(layout, GDP0, { ...EX_OPTS, fontCss: css });
  assert.ok(withFont.includes('<defs><style><![CDATA[' + css + ']]></style></defs>'));
});
