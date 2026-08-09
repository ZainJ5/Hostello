import { handler, ok, readJson, fail } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Hostel from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import { draftListingSchema } from '@/components/owner/schemas';
import { applyListingPatch, uniqueSlug } from '@/app/(owner)/_lib/listing-ops';
import { loadOwnedHostel } from '@/app/(owner)/_lib/owner-data';
import { deleteHostelPhoto } from '@/app/(owner)/_lib/uploads';
import { auditOwner } from '@/app/(owner)/_lib/audit';

export const GET = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);
  return ok({ listing: serialize(hostel.toObject()) });
});

/**
 * Saves an edit. Used both by the wizard's autosave and by the single-page
 * edit form, so it has to tolerate a patch containing a single field.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);

  const patch = draftListingSchema.parse(await readJson(req));
  const previousStatus = hostel.status;
  const { materialChanged } = applyListingPatch(hostel, patch);

  // The slug is only regenerated while the listing has never been public.
  // After that it is frozen so links, bookmarks and rankings survive a rename.
  if (hostel.status === 'draft' && patch.name) {
    hostel.slug = await uniqueSlug(hostel.name, hostel._id);
  }

  // See the edit-policy note in `_lib/listing-ops.js`: a published listing
  // stays published through an edit and only loses its verified badge when
  // something material moved.
  if (previousStatus === 'published' && materialChanged) {
    hostel.verified = false;
  }

  await hostel.save();

  await auditOwner(req, session, 'owner.listing.updated', {
    targetType: 'Hostel',
    targetId: hostel._id,
    meta: {
      status: hostel.status,
      materialChanged,
      fields: Object.keys(patch),
    },
  });

  return ok({
    listing: serialize(hostel.toObject()),
    verifiedCleared: previousStatus === 'published' && materialChanged,
  });
});

/**
 * Deletes a listing. Only drafts and rejected listings can be removed by the
 * owner. Anything that has been live, paid for, or is mid-review has records
 * attached to it and has to go through an admin.
 */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);

  if (!['draft', 'rejected'].includes(hostel.status) && session.role !== 'admin') {
    return fail(
      'Only drafts and rejected listings can be deleted. Contact support to remove a live listing.',
      409
    );
  }

  const images = [...(hostel.images || [])];
  await hostel.deleteOne();

  // Only unlink a file no other listing still points at.
  for (const image of images) {
    const stillUsed = await Hostel.countDocuments({ images: image }).limit(1);
    if (!stillUsed) await deleteHostelPhoto(image);
  }

  await auditOwner(req, session, 'owner.listing.deleted', {
    targetType: 'Hostel',
    targetId: id,
    meta: { name: hostel.name, status: hostel.status },
  });

  return ok({ deleted: true });
});
