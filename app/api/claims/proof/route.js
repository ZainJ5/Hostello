import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { handler, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { MAX_CLAIM_PROOF } from '@/lib/claims';

/**
 * Proof photos for a listing claim: a utility bill, a rent agreement, the
 * signboard with the hostel's name on it.
 *
 * Written under public/uploads/claims, which NGINX serves off disk like the
 * listing photography. These are business documents rather than secrets, and
 * the path carries 16 random bytes, but nothing links to them outside the
 * admin console. The validation is the avatar route's, for the same reason:
 * the `type` on an uploaded File is attacker controlled, so the declared MIME,
 * the real byte length and a magic number sniff all have to agree before
 * anything touches disk, and the extension comes from the sniff and never from
 * the uploaded filename. That last part is what keeps a double extension or a
 * traversal out of public/.
 *
 * The file is written before any claim exists, because the form uploads as the
 * person picks each photo rather than making them wait on submit. An upload
 * that is never submitted leaves an orphan, which is the same trade the
 * listing image uploader already makes.
 */

const CLAIM_DIR = path.join(process.cwd(), 'public', 'uploads', 'claims');
const MAX_BYTES = 6 * 1024 * 1024;

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

export const POST = handler(async (req) => {
  const session = await requireRole();

  // Generous, so somebody picking the wrong file repeatedly is never locked
  // out. The quota that matters is counted after validation.
  enforceRateLimit(`claim:proof:attempt:${session.userId}`, { max: 60, windowMs: 60 * 60_000 });

  const form = await req.formData();
  const files = form.getAll('files').filter((f) => f && typeof f.arrayBuffer === 'function');

  if (!files.length) throw badRequest('Choose a photo to upload');
  if (files.length > MAX_CLAIM_PROOF) {
    throw badRequest(`Attach at most ${MAX_CLAIM_PROOF} photos`);
  }

  const buffers = [];
  for (const file of files) {
    if (file.size === 0) throw badRequest('That file is empty');
    if (file.size > MAX_BYTES) throw badRequest('Each photo must be under 6 MB', 413);
    if (file.type && !Object.keys(ALLOWED).includes(file.type)) {
      throw badRequest('Use a JPG, PNG, WebP or AVIF image', 415);
    }

    const buf = Buffer.from(await file.arrayBuffer());
    // File.size is client metadata, so the real length is checked again.
    if (buf.length > MAX_BYTES) throw badRequest('Each photo must be under 6 MB', 413);

    const real = sniff(buf);
    if (!real) throw badRequest('That file is not a readable image', 415);
    if (file.type && file.type !== real) {
      throw badRequest('That file does not match its image type', 415);
    }
    buffers.push({ buf, ext: ALLOWED[real] });
  }

  // Counted only once every file is known to be a real image, so rejections do
  // not cost somebody their ability to attach proof.
  enforceRateLimit(`claim:proof:write:${session.userId}`, { max: 20, windowMs: 60 * 60_000 });

  await fs.mkdir(CLAIM_DIR, { recursive: true });

  const paths = [];
  for (const { buf, ext } of buffers) {
    const name = `claim-${crypto.randomBytes(16).toString('hex')}.${ext}`;
    await fs.writeFile(path.join(CLAIM_DIR, name), buf);
    paths.push(`/uploads/claims/${name}`);
  }

  return ok({ ok: true, paths });
});
