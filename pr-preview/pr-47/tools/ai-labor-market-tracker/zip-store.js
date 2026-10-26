/* ===========================================================================
 * zip-store.js — dependency-free, store-only (uncompressed) ZIP writer.
 *
 * Bundles small text files (the tracker's CSVs + README/citation) into one
 * .zip Blob. No compression — the payload is tiny and store-only keeps the
 * code small and the output trivially readable. Filenames are written UTF-8
 * (general-purpose bit 11) and may contain "/" to create folders.
 *
 * Reference: PKWARE APPNOTE (local file header, central directory, EOCD).
 * =========================================================================== */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const enc = new TextEncoder();
const toBytes = (data) => (typeof data === "string" ? enc.encode(data) : data);

// Fixed DOS timestamp = 1980-01-01 00:00 (the ZIP epoch) so output is
// deterministic and doesn't depend on the clock.
const DOS_TIME = 0;
const DOS_DATE = 0x21;

const FLAG_UTF8 = 0x0800;   // general-purpose bit 11: filename is UTF-8
const VERSION = 20;         // 2.0

// files: [{ name: string, data: string | Uint8Array }] → Blob (application/zip)
export function zipStore(files) {
  const entries = files.map(f => {
    const nameBytes = enc.encode(f.name);
    const data = toBytes(f.data);
    return { nameBytes, data, crc: crc32(data) };
  });

  const chunks = [];
  let offset = 0;
  const push = (bytes) => { chunks.push(bytes); offset += bytes.length; };

  const central = [];
  for (const e of entries) {
    const localOffset = offset;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);          // local file header signature
    h.setUint16(4, VERSION, true);             // version needed to extract
    h.setUint16(6, FLAG_UTF8, true);           // general-purpose flags
    h.setUint16(8, 0, true);                   // compression method: store
    h.setUint16(10, DOS_TIME, true);
    h.setUint16(12, DOS_DATE, true);
    h.setUint32(14, e.crc, true);
    h.setUint32(18, e.data.length, true);      // compressed size
    h.setUint32(22, e.data.length, true);      // uncompressed size
    h.setUint16(26, e.nameBytes.length, true);
    h.setUint16(28, 0, true);                  // extra field length
    push(new Uint8Array(h.buffer));
    push(e.nameBytes);
    push(e.data);

    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);          // central directory signature
    c.setUint16(4, VERSION, true);             // version made by
    c.setUint16(6, VERSION, true);             // version needed
    c.setUint16(8, FLAG_UTF8, true);
    c.setUint16(10, 0, true);                  // method: store
    c.setUint16(12, DOS_TIME, true);
    c.setUint16(14, DOS_DATE, true);
    c.setUint32(16, e.crc, true);
    c.setUint32(20, e.data.length, true);
    c.setUint32(24, e.data.length, true);
    c.setUint16(28, e.nameBytes.length, true);
    c.setUint16(30, 0, true);                  // extra field length
    c.setUint16(32, 0, true);                  // comment length
    c.setUint16(34, 0, true);                  // disk number start
    c.setUint16(36, 0, true);                  // internal attributes
    c.setUint32(38, 0, true);                  // external attributes
    c.setUint32(42, localOffset, true);        // offset of local header
    central.push(new Uint8Array(c.buffer));
    central.push(e.nameBytes);
  }

  const cdStart = offset;
  for (const c of central) push(c);
  const cdSize = offset - cdStart;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);         // end-of-central-directory sig
  eocd.setUint16(4, 0, true);                  // this disk number
  eocd.setUint16(6, 0, true);                  // disk with central directory
  eocd.setUint16(8, entries.length, true);     // entries on this disk
  eocd.setUint16(10, entries.length, true);    // total entries
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, cdStart, true);
  eocd.setUint16(20, 0, true);                 // comment length
  push(new Uint8Array(eocd.buffer));

  return new Blob(chunks, { type: "application/zip" });
}
