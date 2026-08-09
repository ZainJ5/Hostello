import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Server-side file intake for listing photos and payment screenshots.
 *
 * The client's `type` on a `File` is attacker-controlled, so every upload is
 * checked three ways before it touches disk: declared MIME, byte length, and a
 * magic-number sniff of the first bytes. The extension we write is derived from
 * the sniffed type, never from the uploaded filename, which also removes any
 * chance of a path-traversal or double-extension filename landing in `public/`.
 */

const HOSTEL_DIR = path.join(process.cwd(), 'public', 'uploads', 'hostels');
const PAYMENT_DIR = path.join(process.cwd(), 'public', 'uploads', 'payments');

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTOS_PER_LISTING = 15;

const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export const ACCEPTED_MIME = Object.keys(ALLOWED);

function badRequest(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Reads the container signature. Returns a MIME string or null. */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  // ISO-BMFF: `....ftyp<brand>`. AVIF and HEIC share the box layout.
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

/**
 * Validates an incoming `File` from a multipart form and returns its bytes plus
 * the extension to write. Throws a 4xx-tagged error the api `handler` renders.
 */
async function validateImage(file, maxBytes, what) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw badRequest(`Choose a ${what} to upload`, 422);
  }
  if (file.size === 0) throw badRequest(`That ${what} is empty`, 422);
  if (file.size > maxBytes) {
    throw badRequest(
      `${what[0].toUpperCase()}${what.slice(1)} must be under ${Math.round(maxBytes / 1024 / 1024)} MB`,
      413
    );
  }
  if (file.type && !ACCEPTED_MIME.includes(file.type)) {
    throw badRequest('Only JPG, PNG, WebP, AVIF or GIF images are accepted', 415);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Re-check the real length: `File.size` is client metadata.
  if (buf.length > maxBytes) throw badRequest(`That ${what} is too large`, 413);

  const real = sniff(buf);
  if (!real) throw badRequest('That file is not a readable image', 415);
  if (file.type && file.type !== real) {
    throw badRequest('That file does not match its image type', 415);
  }

  return { buf, ext: ALLOWED[real], mime: real };
}

/**
 * Listing photo. Keeps the existing `hostel-<timestamp>-<random>.<ext>` naming
 * convention so nothing already on disk needs a migration.
 */
export async function saveHostelPhoto(file) {
  const { buf, ext } = await validateImage(file, MAX_PHOTO_BYTES, 'photo');
  await fs.mkdir(HOSTEL_DIR, { recursive: true });
  const name = `hostel-${Date.now()}-${crypto.randomInt(100000, 999999)}.${ext}`;
  await fs.writeFile(path.join(HOSTEL_DIR, name), buf);
  return `/uploads/hostels/${name}`;
}

/**
 * Payment screenshot. Unlike listing photos these are private, so the filename
 * is 32 hex characters of CSPRNG entropy, so it cannot be guessed by
 * enumeration, and the UI reads them back through the authenticated
 * `/api/owner/payments/[id]/screenshot` route rather than the public path.
 */
export async function savePaymentScreenshot(file) {
  const { buf, ext } = await validateImage(file, MAX_SCREENSHOT_BYTES, 'screenshot');
  await fs.mkdir(PAYMENT_DIR, { recursive: true });
  const name = `pay-${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(PAYMENT_DIR, name), buf);
  return `/uploads/payments/${name}`;
}

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
};

/**
 * Resolves a stored `/uploads/payments/...` path to an absolute file path,
 * refusing anything that escapes the payments directory. Returns null when the
 * value is unusable, so callers answer 404 rather than leaking the reason.
 */
export function resolvePaymentScreenshot(stored) {
  if (typeof stored !== 'string' || !stored.startsWith('/uploads/payments/')) return null;
  const name = stored.slice('/uploads/payments/'.length);
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return null;

  const abs = path.join(PAYMENT_DIR, name);
  const rel = path.relative(PAYMENT_DIR, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;

  const mime = MIME_BY_EXT[path.extname(name).toLowerCase()];
  if (!mime) return null;
  return { abs, mime, name };
}

/**
 * Deletes a listing photo from disk after it has been removed from the
 * document. Best-effort: a missing file is not an error worth failing the
 * request over, and images hosted on Unsplash have no local file at all.
 */
export async function deleteHostelPhoto(stored) {
  if (typeof stored !== 'string' || !stored.startsWith('/uploads/hostels/')) return;
  const name = stored.slice('/uploads/hostels/'.length);
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return;
  try {
    await fs.unlink(path.join(HOSTEL_DIR, name));
  } catch {
    /* already gone */
  }
}
