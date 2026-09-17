import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, created, fail, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  ACCEPTED_MIME,
  MAX_UPLOAD_BYTES,
  deleteHostelImage,
  saveHostelImage,
} from '@/app/api/admin/_lib/uploads';
import { writeAudit } from '@/app/api/admin/_lib/audit';

export const runtime = 'nodejs';

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i;

/** Downloads one https image into a File, or returns { name, error }. */
async function fetchRemoteImage(raw, index) {
  const name = `link-${index + 1}`;
  let url;
  try {
    url = new URL(String(raw));
  } catch {
    return { name, error: 'Not a valid link' };
  }
  if (url.protocol !== 'https:' || PRIVATE_HOST.test(url.hostname) || /^[\d.]+$/.test(url.hostname)) {
    return { name, error: 'Only public https image links are accepted' };
  }
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Hostello admin photo import)' },
    });
    if (!res.ok) return { name, error: `The link answered ${res.status}` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_UPLOAD_BYTES) return { name, error: 'That image is over 8 MB' };
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    return new File([buf], `${name}.jpg`, { type: ACCEPTED_MIME.includes(type) ? type : '' });
  } catch {
    return { name, error: 'Could not download that link' };
  }
}

/**
 * Listing-photo upload, as multipart files or as a JSON list of image links. Type and size are enforced here, on the
 * server, against the file's actual bytes. The browser's accept attribute is
 * a convenience, not a control.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');
  enforceRateLimit(`admin-upload:${clientIp(req)}`, { max: 60, windowMs: 60_000 });

  let files;
  if ((req.headers.get('content-type') || '').includes('application/json')) {
    // Photos by link, fetched on the server so the browser never has to deal
    // with the source site's CORS rules.
    const body = await req.json().catch(() => ({}));
    const urls = Array.isArray(body.urls) ? body.urls.slice(0, 12) : [];
    if (!urls.length) return fail('Add at least one image link', 400);
    files = await Promise.all(urls.map((u, i) => fetchRemoteImage(u, i)));
  } else {
    let form;
    try {
      form = await req.formData();
    } catch {
      return fail('Send the images as multipart/form-data', 400);
    }
    files = form.getAll('files').filter((f) => typeof f === 'object' && f);
  }
  if (!files.length) return fail('Choose at least one image', 400);
  if (files.length > 12) return fail('Upload at most 12 images at a time', 400);

  const saved = [];
  const failed = [];

  for (const file of files) {
    if (file?.error) {
      failed.push({ name: file.name, error: file.error });
      continue;
    }
    try {
      saved.push(await saveHostelImage(file));
    } catch (err) {
      failed.push({ name: file?.name || 'file', error: err.message });
    }
  }

  if (!saved.length) {
    return fail(failed[0]?.error || 'None of those files were valid images', 415, { failed });
  }

  await writeAudit(req, session, {
    action: 'upload.create',
    targetType: 'Upload',
    targetId: saved.map((s) => s.url).join(', ').slice(0, 200),
    meta: { count: saved.length, rejected: failed.length },
  });

  return created({ files: saved, failed });
});

/** Removes a photo from disk once it has been taken off a listing. */
export const DELETE = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');

  const path = new URL(req.url).searchParams.get('path');
  if (!path) return fail('Which file?', 400);

  const res = await deleteHostelImage(path);

  await writeAudit(req, session, {
    action: 'upload.delete',
    targetType: 'Upload',
    targetId: path,
    meta: { removed: res.removed },
  });

  return ok(res);
});
