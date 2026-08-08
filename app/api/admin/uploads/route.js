import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, created, fail, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { deleteHostelImage, saveHostelImage } from '@/app/api/admin/_lib/uploads';
import { writeAudit } from '@/app/api/admin/_lib/audit';

export const runtime = 'nodejs';

/**
 * Multipart listing-photo upload. Type and size are enforced here, on the
 * server, against the file's actual bytes — the browser's accept attribute is
 * a convenience, not a control.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');
  enforceRateLimit(`admin-upload:${clientIp(req)}`, { max: 60, windowMs: 60_000 });

  let form;
  try {
    form = await req.formData();
  } catch {
    return fail('Send the images as multipart/form-data', 400);
  }

  const files = form.getAll('files').filter((f) => typeof f === 'object' && f);
  if (!files.length) return fail('Choose at least one image', 400);
  if (files.length > 12) return fail('Upload at most 12 images at a time', 400);

  const saved = [];
  const failed = [];

  for (const file of files) {
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
