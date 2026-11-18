// Runs embed/v1/embed.js against a stub DOM. Every published embed loads this file, so the
// opt-in features are pinned to their snippet attribute: without it, the iframe src and the
// window listeners must stay exactly as in v1.1.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SOURCE = readFileSync(new URL('../../embed/v1/embed.js', import.meta.url), 'utf8');
const LOADER = 'https://interactives.budgetlab.yale.edu/embed/v1/embed.js';

function el(tag) {
  return {
    tagName: tag,
    style: { setProperty() {} },
    classList: { contains: () => false },
    parentElement: null,
    contentWindow: { posted: [], postMessage(msg, origin) { this.posted.push({ msg, origin }); } },
    scrolled: 0,
    scrollIntoView() { this.scrolled++; },
    appendChild(c) { this.child = c; },
  };
}

function load({ attrs, hash = '' }) {
  const body = el('body');
  const created = [];
  const listeners = [];
  let resizerOpts = null;
  let resizerTarget = null;
  const script = {
    src: LOADER,
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    hasAttribute: (n) => n in attrs,
    parentNode: { insertBefore(node) { node.parentElement = body; } },
  };
  const document = {
    currentScript: script,
    body,
    head: { appendChild() {} },
    createElement(tag) { const e = el(tag); created.push(e); return e; },
  };
  const window = {
    location: { href: `https://budgetlab.yale.edu/research/article${hash}`, hash },
    addEventListener(type, fn) { listeners.push({ type, fn }); },
    iFrameResize(opts, target) { resizerOpts = opts; resizerTarget = target; },
  };
  vm.runInNewContext(SOURCE, { window, document, URL, console, setTimeout, clearTimeout });
  const iframe = created.find((e) => e.tagName === 'iframe');
  const wrapper = created.find((e) => e.tagName === 'div');
  const messageListeners = listeners.filter((l) => l.type === 'message').map((l) => l.fn);
  return { iframe, wrapper, messageListeners, resizerOpts, resizerTarget };
}

test('iframe-resizer gets the iframe itself, so snapshot embeds (slash in the id) are sized', () => {
  for (const tool of ['blsmm', 'blsmm/versions/2026-10-06']) {
    const { iframe, resizerTarget } = load({ attrs: { 'data-tool': tool } });
    assert.equal(resizerTarget, iframe, tool);
  }
});

test('without data-deep-link: src, listeners and scrolling are as before', () => {
  const { iframe, wrapper, messageListeners, resizerOpts } = load({ attrs: { 'data-tool': 'blsmm' }, hash: '#blsmm:preset=rapid_ai' });
  assert.equal(iframe.src, 'https://interactives.budgetlab.yale.edu/tools/blsmm/');
  assert.equal(messageListeners.length, 0);
  resizerOpts.onResized({ height: 900 });
  assert.equal(wrapper.style.height, '900px');
  assert.equal(wrapper.scrolled, 0);
});

test('data-deep-link forwards the tool’s hash state and scrolls to the embed once', () => {
  const { iframe, wrapper, resizerOpts } = load({ attrs: { 'data-tool': 'blsmm', 'data-deep-link': '' }, hash: '#blsmm:preset=rapid_ai&fast=1' });
  assert.equal(iframe.src, 'https://interactives.budgetlab.yale.edu/tools/blsmm/#preset=rapid_ai&fast=1');
  resizerOpts.onResized({ height: 400 });
  resizerOpts.onResized({ height: 900 });
  assert.equal(wrapper.scrolled, 1);
});

test('data-deep-link ignores another tool’s hash and a plain anchor', () => {
  for (const hash of ['#other-tool:x=1', '#section-2', '']) {
    const { iframe, wrapper, resizerOpts } = load({ attrs: { 'data-tool': 'blsmm', 'data-deep-link': '' }, hash });
    assert.equal(iframe.src, 'https://interactives.budgetlab.yale.edu/tools/blsmm/', hash);
    resizerOpts.onResized({ height: 900 });
    assert.equal(wrapper.scrolled, 0, hash);
  }
});

test('a snapshot embed answers to its tool slug', () => {
  const { iframe } = load({ attrs: { 'data-tool': 'blsmm/versions/2026-10-06', 'data-deep-link': '' }, hash: '#blsmm:preset=rapid_ai' });
  assert.equal(iframe.src, 'https://interactives.budgetlab.yale.edu/tools/blsmm/versions/2026-10-06/#preset=rapid_ai');
});

test('host URL is sent only to its own iframe, only on request, without the hash', () => {
  const { iframe, messageListeners } = load({ attrs: { 'data-tool': 'blsmm', 'data-deep-link': '' }, hash: '#blsmm:preset=rapid_ai' });
  assert.equal(messageListeners.length, 1);
  const [onMessage] = messageListeners;
  onMessage({ source: {}, data: { type: 'TBL_EMBED_HOST_REQUEST' } });
  onMessage({ source: iframe.contentWindow, data: '[iFrameSizer]message' });
  onMessage({ source: iframe.contentWindow, data: { type: 'BUDGET_LAB_GTM_EVENT' } });
  assert.equal(iframe.contentWindow.posted.length, 0);
  onMessage({ source: iframe.contentWindow, data: { type: 'TBL_EMBED_HOST_REQUEST' } });
  // The message object comes from the vm's realm, so compare its JSON form.
  assert.deepEqual(JSON.parse(JSON.stringify(iframe.contentWindow.posted)), [{
    msg: { type: 'TBL_EMBED_HOST', url: 'https://budgetlab.yale.edu/research/article', key: 'blsmm' },
    origin: 'https://interactives.budgetlab.yale.edu',
  }]);
});
