import crypto from 'crypto';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import PageView from '@/models/PageView';
import User from '@/models/User';
import { HOSTEL_CARD_FIELDS } from '@/components/student/constants';

const toggleSchema = z.object({
  hostelId: z.string().regex(/^[a-f\d]{24}$/i, 'That listing could not be found'),
  /**
   * Optional desired state. Omit it and the call toggles; send it and the call
   * is idempotent — the client can retry, or fire twice from a double-click,
   * and both the saved list and `Hostel.saveCount` land in the same place.
   */
  saved: z.boolean().optional(),
});

/** Hashed, non-reversible visitor id for the analytics row. */
function visitorHash(userId) {
  return crypto.createHash('sha256').update(`save:${userId}`).digest('hex').slice(0, 32);
}

/**
 * GET /api/saved — the caller's saved listings, most recently saved first.
 *
 * `User.savedHostels` is append-ordered, so reversing it gives recency without
 * storing a timestamp. Suspended and unpublished listings are filtered out
 * rather than rendered as dead cards.
 */
export const GET = handler(async () => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const user = await User.findById(session.userId).select('savedHostels').lean();
  const ids = (user?.savedHostels || []).map(String);

  if (!ids.length) return ok({ hostels: [], savedIds: [] });

  const rows = await Hostel.find({ _id: { $in: ids }, status: 'published' })
    .select(HOSTEL_CARD_FIELDS)
    .lean();

  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id)));

  return ok({ hostels: serialize(rows), savedIds: ids });
});

/**
 * POST /api/saved — save or unsave a listing.
 *
 * Counter integrity is the whole job here. `Hostel.saveCount` and the
 * `PageView` analytics row are only touched when the student's array actually
 * changed, which `findOneAndUpdate` tells us by returning the pre-image: an
 * `$addToSet` on a hostel already in the list is a no-op, and so is the
 * matching increment. That is what makes a repeated request harmless.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const body = toggleSchema.parse(await readJson(req));

  const hostel = await Hostel.findOne({ _id: body.hostelId, status: 'published' })
    .select('_id ownerId')
    .lean();

  if (!hostel) return fail('That hostel is no longer listed', 404);

  const before = await User.findById(session.userId).select('savedHostels').lean();
  if (!before) return fail('Sign in to continue', 401);

  const wasSaved = (before.savedHostels || []).some(
    (id) => String(id) === String(hostel._id)
  );
  const desired = typeof body.saved === 'boolean' ? body.saved : !wasSaved;

  let changed = false;
  if (desired !== wasSaved) {
    const res = await User.updateOne(
      { _id: session.userId },
      desired
        ? { $addToSet: { savedHostels: hostel._id } }
        : { $pull: { savedHostels: hostel._id } }
    );
    changed = res.modifiedCount === 1;
  }

  if (changed) {
    if (desired) {
      await Hostel.updateOne({ _id: hostel._id }, { $inc: { saveCount: 1 } });
      // Owner analytics read `PageView`, not the counter — `save` is one of
      // the two conversion signals on their dashboard.
      try {
        await PageView.create({
          hostelId: hostel._id,
          ownerId: hostel.ownerId || null,
          kind: 'save',
          visitor: visitorHash(session.userId),
        });
      } catch (err) {
        console.error('[saved] analytics write failed', err);
      }
    } else {
      // Guarded so a stray unsave can never drive the counter negative.
      await Hostel.updateOne(
        { _id: hostel._id, saveCount: { $gt: 0 } },
        { $inc: { saveCount: -1 } }
      );
    }
  }

  const savedCount =
    (before.savedHostels || []).length + (changed ? (desired ? 1 : -1) : 0);

  return ok({
    saved: desired,
    changed,
    hostelId: String(hostel._id),
    savedCount,
  });
});
