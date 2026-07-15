/**
 * Budget Lab Interactives — embed loader
 * @version 1.0.0
 * Snippet: <script src=".../embed/v1/embed.js" data-tool="..."></script>
 * Docs: https://github.com/Budget-Lab-Yale/budget-lab-interactives#embedding
 * MIT licensed.
 */
(function () {
  'use strict';

  var me = document.currentScript;
  if (!me) return;

  var tool = me.getAttribute('data-tool');
  if (!tool) {
    console.error('[TBL embed] data-tool attribute is required.');
    return;
  }

  // Loader lives at /embed/v1/embed.js with iframe-resizer pinned alongside
  // it. Tools live at /tools/<tool>/, unversioned.
  var srcUrl     = new URL(me.src, window.location.href);
  var loaderBase = srcUrl.origin + srcUrl.pathname.replace(/\/embed\.js$/, '/');
  var toolsBase  = new URL('../../tools/', loaderBase).href;

  // Wrapper takes flow space; iframe is position:absolute inside it. This
  // defeats host CSS that targets <iframe> directly (e.g. Drupal's
  // responsive-embed modules) which would otherwise take the iframe out
  // of flow. Initial height is small so iframe-resizer grows the wrapper
  // to actual content height rather than shrinking from a too-tall default.
  var initialHeight = (me.getAttribute('data-height') || '100') + 'px';
  var wrapper = document.createElement('div');
  wrapper.className     = 'tbl-embed-wrapper';
  wrapper.style.cssText = 'position:relative !important;display:block !important;width:100% !important;max-width:100% !important;height:' + initialHeight + ';';

  var iframe = document.createElement('iframe');
  iframe.id        = 'tbl-embed-' + tool + '-' + Math.random().toString(36).slice(2, 8);
  iframe.src       = toolsBase + tool + '/';
  iframe.title     = me.getAttribute('data-title') || tool;
  iframe.scrolling = 'no';
  iframe.loading   = 'lazy';
  iframe.style.cssText = 'position:absolute !important;top:0 !important;left:0 !important;width:100% !important;height:100% !important;border:0 !important;display:block !important;';

  wrapper.appendChild(iframe);
  me.parentNode.insertBefore(wrapper, me);

  // Strip width-dependent height from host-CMS wrapper classes (e.g.,
  // Drupal's paragraph-embed-code applies padding-bottom for responsive-
  // embed aspect-ratio enforcement). Extendable per-embed via
  // data-strip-host-classes (comma-separated).
  var stripClasses = (me.getAttribute('data-strip-host-classes') ||
                      'paragraph-embed-code').split(',').map(function (s) { return s.trim(); });
  var p = wrapper.parentElement;
  while (p && p !== document.body) {
    for (var i = 0; i < stripClasses.length; i++) {
      if (p.classList && p.classList.contains(stripClasses[i])) {
        p.style.setProperty('padding-bottom', '0', 'important');
        p.style.setProperty('min-height', '0', 'important');
        p.style.setProperty('height', 'auto', 'important');
        p.style.setProperty('aspect-ratio', 'auto', 'important');
      }
    }
    p = p.parentElement;
  }

  function init() {
    window.iFrameResize({
      log: me.hasAttribute('data-log'),
      checkOrigin: false,
      // bodyOffset measures body.offsetHeight directly. Other methods
      // (bodyScroll, lowestElement) can ratchet up to the iframe viewport
      // size and fail to shrink when content shrinks.
      heightCalculationMethod: 'bodyOffset',
      tolerance: 4,
      scrolling: false,
      onResized: function (data) { wrapper.style.height = data.height + 'px'; },
    }, '#' + iframe.id);

    // iframe-resizer's content script doesn't listen for window resize.
    // When the host page reflows, content inside the iframe may also reflow
    // via CSS (button text wrapping, etc.) without firing a DOM mutation,
    // so iframe-resizer wouldn't re-measure. Hook host resize, debounced.
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (iframe.iFrameResizer && iframe.iFrameResizer.resize) {
          iframe.iFrameResizer.resize();
        }
      }, 150);
    });
  }

  if (window.iFrameResize) {
    init();
  } else {
    var s = document.createElement('script');
    s.src = loaderBase + 'iframeResizer.min.js';
    s.onload  = init;
    s.onerror = function () { console.error('[TBL embed] failed to load iframe-resizer.'); };
    document.head.appendChild(s);
  }
}());
