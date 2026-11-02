// tools/taxes-at-the-top/render/export.js
//
// Tool-side PNG and CSV download for hand-built SVG views (currently the "How
// policies stack" package view — see render/stack.js). No external libs: an
// off-DOM <canvas> for the PNG rasterization, Blob + object-URL for the files.
//
// SVG is still serialized here, but only as the intermediate step to a PNG —
// there is no .svg download button any more (Sylva, 2026-08-04: PNG and data
// only). serializeSvg/standaloneSvgMarkup stay exported because that
// serialization is what downloadPNG rasterizes, and it carries unit tests.
//
// standaloneSvgMarkup is the pure, DOM-free half of "serialize the SVG" —
// it only normalizes an already-serialized markup *string* (ensure the SVG
// namespace is declared, prefix an XML declaration) so a downloaded .svg
// file opens correctly standalone (image viewers, Illustrator, a bare
// <img src>) without relying on the host page's stylesheet or DOM. It is
// exercised directly by test/render.test.mjs. serializeSvg is the thin DOM-
// facing wrapper around it (calls the real XMLSerializer on a live SVGElement)
// and isn't itself unit-tested — bare `node --test` has no DOM/XMLSerializer
// to construct a real SVGElement against; standaloneSvgMarkup carries the
// test coverage for the serialization logic that matters (the string
// normalization), and serializeSvg/downloadSVG/downloadPNG are verified
// manually in-browser (see task-11-report.md).

export function standaloneSvgMarkup(markup) {
  if (typeof markup !== 'string' || !markup.trim()) {
    throw new Error('standaloneSvgMarkup: expected a non-empty SVG markup string');
  }
  var out = markup.trim();
  if (!/<svg[^>]*\sxmlns=/.test(out)) {
    out = out.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/^<\?xml/.test(out)) {
    out = '<?xml version="1.0" standalone="no"?>\n' + out;
  }
  return out;
}

// DOM-facing: real XMLSerializer on a live SVGSVGElement, then the pure
// normalization above. Not reachable from bare `node --test` (no DOM).
export function serializeSvg(svgEl) {
  var xml = new XMLSerializer().serializeToString(svgEl);
  return standaloneSvgMarkup(xml);
}

function triggerBlobDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a moment to start before freeing the blob URL.
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}

// Pure: rows of cells -> RFC-4180 CSV text. Quotes any cell containing a comma,
// quote or newline, doubling embedded quotes. Kept DOM-free so the stack view's
// data export can be asserted in `node --test`.
export function toCsv(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('toCsv: expected a non-empty array of row arrays');
  }
  return rows.map(function (row) {
    return row.map(function (cell) {
      var s = cell === null || cell === undefined ? '' : String(cell);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n') + '\r\n';
}

// BOM so Excel opens the UTF-8 minus signs and en-dashes correctly rather than
// as mojibake — these tables carry both.
export function downloadCSV(rows, filename) {
  var blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  triggerBlobDownload(blob, filename);
}

// Renders the SVG at 2x its declared size for a crisp raster export, then
// downloads the canvas as a PNG. Returns a Promise (rasterization is async:
// the serialized SVG has to round-trip through an <img> load).
export function downloadPNG(svgEl, filename) {
  var EXPORT_SCALE = 2;
  var markup = serializeSvg(svgEl);
  var w = svgEl.viewBox && svgEl.viewBox.baseVal && svgEl.viewBox.baseVal.width;
  var h = svgEl.viewBox && svgEl.viewBox.baseVal && svgEl.viewBox.baseVal.height;
  if (!w) w = Number(svgEl.getAttribute('width')) || svgEl.clientWidth || 800;
  if (!h) h = Number(svgEl.getAttribute('height')) || svgEl.clientHeight || 400;

  var svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  var url = URL.createObjectURL(svgBlob);

  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * EXPORT_SCALE));
      canvas.height = Math.max(1, Math.round(h * EXPORT_SCALE));
      var ctx = canvas.getContext('2d');
      ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) {
        if (!blob) { reject(new Error('downloadPNG: canvas.toBlob returned null')); return; }
        triggerBlobDownload(blob, filename);
        resolve();
      }, 'image/png');
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error('downloadPNG: the serialized SVG failed to load as an image'));
    };
    img.src = url;
  });
}
