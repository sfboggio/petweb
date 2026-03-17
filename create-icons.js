/**
 * create-icons.js
 * Creates icons/icon-192.png and icons/icon-512.png
 * Zero external dependencies — uses only Node.js built-ins.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CRC-32 table (declared before everything else) ────────────────────────────
const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c;
  }
  return t;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const ICONS_DIR = path.join(__dirname, 'icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

[192, 512].forEach(size => {
  const pixels = drawIcon(size);
  const png    = encodePNG(size, size, pixels);
  fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}.png`), png);
  console.log(`✅ icons/icon-${size}.png created`);
});

// ── Icon drawing ──────────────────────────────────────────────────────────────

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4);

  // Pink (#ec4899) → purple (#a855f7) gradient
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const r = Math.round(0xec + t * (0xa8 - 0xec));
    const g = Math.round(0x48 + t * (0x55 - 0x48));
    const b = Math.round(0x99 + t * (0xf7 - 0x99));
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = 255;
    }
  }

  // White paw print
  const cx = size * 0.5;
  const cy = size * 0.58;
  const mw = size * 0.22;
  const mh = size * 0.18;
  fillEllipse(buf, size, cx, cy, mw, mh);

  const toeR   = size * 0.085;
  const toeY   = cy - mh - toeR * 1.1;
  const spread = mw * 0.7;
  fillEllipse(buf, size, cx - spread,       toeY + toeR * 0.4, toeR, toeR);
  fillEllipse(buf, size, cx - spread * 0.3, toeY,              toeR, toeR);
  fillEllipse(buf, size, cx + spread * 0.3, toeY,              toeR, toeR);
  fillEllipse(buf, size, cx + spread,       toeY + toeR * 0.4, toeR, toeR);

  return buf;
}

function fillEllipse(buf, size, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const i = (y * size + x) * 4;
        buf[i] = 255; buf[i+1] = 255; buf[i+2] = 255; buf[i+3] = 255;
      }
    }
  }
}

// ── PNG encoder ───────────────────────────────────────────────────────────────

function encodePNG(w, h, pixels) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: None
    pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = pngChunk('IHDR', buildIHDR(w, h));
  const idat = pngChunk('IDAT', compressed);
  const iend = pngChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

function buildIHDR(w, h) {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0);
  b.writeUInt32BE(h, 4);
  b[8] = 8; b[9] = 6; // 8-bit RGBA
  return b;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);

  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal   = crc32(crcInput);
  const crcBuf   = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal >>> 0);

  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}
