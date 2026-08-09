import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/db';
import { handler, ok, readJson } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import User from '@/models/User';

/**
 * Profile picture upload.
 *
 * Written under public/uploads/avatars, which NGINX serves straight off disk in
 * production, the same way listing photography is served. Only
 * /uploads/payments/ is blocked at the edge, because those are private; an
 * avatar is shown next to a student's name and is not.
 *
 * The client's `type` on a File is attacker controlled, so every upload is
 * checked three ways before it touches disk: declared MIME, real byte length,
 * and a magic number sniff of the first bytes. The extension written is
 * derived from the sniffed type and never from the uploaded filename, which
 * also removes any chance of a path traversal or a double extension landing
 * inside public/.
 */

const AVATAR_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_BYTES = 3 * 1024 * 1024;

const ALLOWED = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

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
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

function badRequest(message, status = 422) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** Removes a previous avatar so a student's old pictures do not accumulate. */
async function removeExisting(stored) {
  if (typeof stored !== 'string' || !stored.startsWith('/uploads/avatars/')) return;
  const name = stored.slice('/uploads/avatars/'.length);
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return;
  try {
    await fs.unlink(path.join(AVATAR_DIR, name));
  } catch {
    // Already gone. Not worth failing the request over.
  }
}

export const POST = handler(async (req) => {
  const session = await requireRole();
  await connectDB();

  enforceRateLimit(`avatar:${session.userId}`, { max: 10, windowMs: 60 * 60_000 });

  const form = await req.formData();
  const file = form.get('file');

  if (!file || typeof file.arrayBuffer !== 'function') {
    throw badRequest('Choose a picture to upload');
  }
  if (file.size === 0) throw badRequest('That file is empty');
  if (file.size > MAX_BYTES) {
    throw badRequest('The picture must be under 3 MB', 413);
  }
  if (file.type && !Object.keys(ALLOWED).includes(file.type)) {
    throw badRequest('Use a JPG, PNG, WebP or AVIF image', 415);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // File.size is client metadata, so the real length is checked again.
  if (buf.length > MAX_BYTES) throw badRequest('The picture must be under 3 MB', 413);

  const real = sniff(buf);
  if (!real) throw badRequest('That file is not a readable image', 415);
  if (file.type && file.type !== real) {
    throw badRequest('That file does not match its image type', 415);
  }

  await fs.mkdir(AVATAR_DIR, { recursive: true });

  const user = await User.findById(session.userId).select('avatar');
  if (!user) throw badRequest('Sign in to continue', 401);

  const name = `avatar-${crypto.randomBytes(16).toString('hex')}.${ALLOWED[real]}`;
  await fs.writeFile(path.join(AVATAR_DIR, name), buf);

  const previous = user.avatar;
  user.avatar = `/uploads/avatars/${name}`;
  await user.save();

  await removeExisting(previous);

  return ok({ ok: true, avatar: user.avatar });
});

export const DELETE = handler(async (req) => {
  const session = await requireRole();
  await connectDB();

  await readJson(req).catch(() => ({}));

  const user = await User.findById(session.userId).select('avatar');
  if (!user) throw badRequest('Sign in to continue', 401);

  const previous = user.avatar;
  user.avatar = '';
  await user.save();

  await removeExisting(previous);

  return ok({ ok: true, avatar: '' });
});
