import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Hostel from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import { enforceRateLimit } from '@/lib/rate-limit';
import { loadOwnedHostel } from '@/app/(owner)/_lib/owner-data';
import {
  saveHostelPhoto,
  deleteHostelPhoto,
  MAX_PHOTOS_PER_LISTING,
} from '@/app/(owner)/_lib/uploads';
import { auditOwner } from '@/app/(owner)/_lib/audit';

/**
 * Photo upload. Multipart, one or many files under the `files` key.
 *
 * Every file is validated server-side in `_lib/uploads.js` — declared MIME,
 * byte length and a magic-number sniff — before anything is written, and the
 * filename is generated here rather than taken from the upload.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);

  // Writing to disk is the one thing here worth rate limiting.
  enforceRateLimit(`owner-upload:${session.userId}:${clientIp(req)}`, {
    max: 60,
    windowMs: 60_000,
  });

  const form = await req.formData();
  const files = form.getAll('files').filter((f) => typeof f === 'object' && f !== null);
  if (!files.length) return fail('Choose at least one photo to upload', 422);

  const existing = hostel.images || [];
  if (existing.length + files.length > MAX_PHOTOS_PER_LISTING) {
    return fail(
      `A listing can hold ${MAX_PHOTOS_PER_LISTING} photos — you have ${existing.length}.`,
      422
    );
  }

  const added = [];
  for (const file of files) {
    added.push(await saveHostelPhoto(file));
  }

  hostel.images = [...existing, ...added];
  await hostel.save();

  await auditOwner(req, session, 'owner.listing.photos_added', {
    targetType: 'Hostel',
    targetId: hostel._id,
    meta: { count: added.length },
  });

  return ok({ images: serialize(hostel.images), added: serialize(added) });
});

/**
 * Reorder / set cover. The cover photo is simply index 0, so "set as cover" and
 * drag-to-reorder are the same operation and cannot drift out of sync.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);

  const { images } = await readJson(req);
  if (!Array.isArray(images)) return fail('Send the new photo order', 422);

  const current = hostel.images || [];
  const next = images.filter((img) => current.includes(img));
  // Reordering must be a permutation — never a way to add or drop a photo.
  if (next.length !== current.length) {
    return fail('That photo order no longer matches this listing. Refresh and try again.', 409);
  }

  hostel.images = next;
  await hostel.save();
  return ok({ images: serialize(hostel.images) });
});

/** Removes one photo and, if nothing else references it, unlinks the file. */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);

  const { image } = await readJson(req);
  if (!image || !(hostel.images || []).includes(image)) {
    return fail('That photo is not on this listing', 404);
  }

  hostel.images = hostel.images.filter((img) => img !== image);
  await hostel.save();

  const stillUsed = await Hostel.countDocuments({ images: image }).limit(1);
  if (!stillUsed) await deleteHostelPhoto(image);

  await auditOwner(req, session, 'owner.listing.photo_removed', {
    targetType: 'Hostel',
    targetId: hostel._id,
    meta: { image },
  });

  return ok({ images: serialize(hostel.images) });
});
