/**
 * Writes public/uploads/payments/sample-receipt.png, the stand-in screenshot
 * attached to the payment records created by scripts/seed.js.
 *
 * Real submissions are uploaded by owners. This file only keeps the admin
 * approval queue from showing a broken thumbnail on a fresh local install.
 * It is drawn as raw pixels and PNG-encoded with zlib, so the project needs
 * no image library.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 720;
const H = 1080;

// Palette echoes the app's tokens so the image doesn't clash with the UI.
const INK = [15, 23, 42];
const TEAL = [15, 118, 110];
const MUTED = [148, 163, 184];
const LINE = [226, 232, 240];
const PAPER = [255, 255, 255];
const BG = [241, 245, 249];

const px = Buffer.alloc(W * H * 3);

function fill(x0, y0, w, h, [r, g, b]) {
  const x1 = Math.min(W, x0 + w);
  const y1 = Math.min(H, y0 + h);
  for (let y = Math.max(0, y0); y < y1; y++) {
    for (let x = Math.max(0, x0); x < x1; x++) {
      const i = (y * W + x) * 3;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
  }
}

/** A row of blocks standing in for a line of text. */
function textLine(x, y, width, height, colour) {
  fill(x, y, width, height, colour);
}

function circle(cx, cy, radius, [r, g, b]) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const i = (y * W + x) * 3;
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
      }
    }
  }
}

// ─── Compose a bank-transfer confirmation screen ───────────────────────
fill(0, 0, W, H, BG);
fill(40, 60, W - 80, H - 120, PAPER);

// App bar
fill(40, 60, W - 80, 96, TEAL);
textLine(76, 98, 190, 20, [255, 255, 255]);

// Success tick
circle(W / 2, 250, 54, [209, 250, 229]);
circle(W / 2, 250, 44, [5, 150, 105]);
// Tick strokes
for (let i = 0; i < 26; i++) fill(W / 2 - 20 + i * 0.6, 250 + i * 0.6, 7, 7, PAPER);
for (let i = 0; i < 40; i++) fill(W / 2 - 4 + i * 0.7, 265 - i * 0.7, 7, 7, PAPER);

// "Transfer successful"
textLine(W / 2 - 150, 340, 300, 26, INK);
textLine(W / 2 - 90, 384, 180, 16, MUTED);

// Amount
textLine(W / 2 - 110, 440, 220, 42, INK);

fill(76, 528, W - 152, 2, LINE);

// Detail rows: label on the left, value on the right.
const rows = [
  [120, 200],
  [140, 240],
  [110, 180],
  [160, 220],
  [130, 260],
];
let y = 560;
for (const [labelW, valueW] of rows) {
  textLine(76, y, labelW, 15, MUTED);
  textLine(W - 76 - valueW, y - 2, valueW, 19, INK);
  y += 56;
}

fill(76, y + 8, W - 152, 2, LINE);

// Reference block
textLine(76, y + 40, 170, 15, MUTED);
textLine(76, y + 66, 300, 22, TEAL);

// Footer chip, anchored below the reference block rather than to the page
// bottom, so the two can never collide.
const chipY = y + 100;
fill(76, chipY, 240, 46, [240, 253, 250]);
textLine(98, chipY + 15, 196, 16, TEAL);

// ─── PNG encode ─────────────────────────────────────────────────────────
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

// Each scanline is prefixed with a filter byte (0 = none).
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let yy = 0; yy < H; yy++) {
  raw[yy * (W * 3 + 1)] = 0;
  px.copy(raw, yy * (W * 3 + 1) + 1, yy * W * 3, (yy + 1) * W * 3);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: truecolour
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'public', 'uploads', 'payments');
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, 'sample-receipt.png');
fs.writeFileSync(file, png);
console.log(`wrote ${file} (${(png.length / 1024).toFixed(1)} KB, ${W}x${H})`);
