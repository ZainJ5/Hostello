import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

/** 8 MB matches the server-action body limit in next.config.mjs. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export const ACCEPTED_MIME = Object.keys(EXT_BY_MIME);

const HOSTEL_DIR = path.join(process.cwd(), 'public', 'uploads', 'hostels');
const PUBLIC_PREFIX = '/uploads/hostels/';

/**
 * A declared Content-Type is attacker-controlled, so the first bytes decide.
 * Returns the canonical extension, or null when the bytes are not an image we
 * are willing to serve back.
 */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return 'png';
  const ascii = (start, len) => buf.subarray(start, start + len).toString('latin1');
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp';
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4);
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') return 'avif';
  }
  return null;
}

/** `hostel-<timestamp>-<random>.<ext>` — the convention already on disk. */
export function hostelFilename(ext) {
  return `hostel-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}.${ext}`;
}

function reject(message, status = 415) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Validates and writes one uploaded File to public/uploads/hostels.
 * Throws an error carrying `status` so `handler` renders it as clean JSON.
 */
export async function saveHostelImage(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw reject('No file received', 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw reject(
      `"${file.name || 'image'}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 8 MB`,
      413
    );
  }
  if (file.size === 0) throw reject('That file is empty', 400);

  const declared = String(file.type || '').toLowerCase();
  if (declared && !ACCEPTED_MIME.includes(declared)) {
    throw reject(`"${file.name || 'file'}" is not an image we accept`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw reject(`"${file.name || 'file'}" is not a valid image file`);
  // A .png that is really a JPEG is fine; a .png that is really a script is not.
  if (declared && EXT_BY_MIME[declared] !== ext && !(declared === 'image/jpg' && ext === 'jpg')) {
    throw reject(`"${file.name || 'file'}" does not match its declared type`);
  }

  await mkdir(HOSTEL_DIR, { recursive: true });
  const filename = hostelFilename(ext);
  await writeFile(path.join(HOSTEL_DIR, filename), buf);

  return { url: `${PUBLIC_PREFIX}${filename}`, name: file.name || filename, size: file.size };
}

/**
 * Deletes a previously uploaded listing photo. Only paths that resolve inside
 * public/uploads/hostels are touched, so a crafted `../../` cannot escape.
 */
export async function deleteHostelImage(publicPath) {
  const value = String(publicPath || '');
  if (!value.startsWith(PUBLIC_PREFIX)) {
    throw reject('That path is not a managed upload', 400);
  }
  const target = path.resolve(HOSTEL_DIR, path.basename(value));
  if (path.dirname(target) !== path.resolve(HOSTEL_DIR)) {
    throw reject('That path is not a managed upload', 400);
  }
  try {
    await unlink(target);
    return { removed: true };
  } catch (err) {
    // Already gone is a success from the caller's point of view.
    if (err?.code === 'ENOENT') return { removed: false };
    throw err;
  }
}
