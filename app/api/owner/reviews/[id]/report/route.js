import { handler, ok, fail, readJson } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Review from '@/models/Review';
import Hostel from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import { reviewReportSchema } from '@/components/owner/schemas';
import { assertOwned, objectIdOr404 } from '@/app/(owner)/_lib/owner-data';
import { auditOwner } from '@/app/(owner)/_lib/audit';

/**
 * Reports a review for moderation: sets `status: 'flagged'` so it appears in
 * the admin queue, and bumps `flagCount`.
 *
 * Flagging deliberately does NOT delete the review or change the hostel's
 * rating. An owner must never be able to make criticism disappear on their own
 * say-so. Only an admin can move it to `removed`, and only that transition
 * recomputes the rating.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;

  const review = await Review.findById(objectIdOr404(id, 'review'));
  if (!review) return fail('That review no longer exists', 404);

  const hostel = await Hostel.findById(review.hostelId).select('ownerId name');
  assertOwned(hostel, session, 'review');

  if (review.status === 'flagged') {
    return fail('This review has already been reported and is with our moderators.', 409);
  }
  if (review.status === 'removed') {
    return fail('This review was already removed.', 409);
  }

  const { reason } = reviewReportSchema.parse(await readJson(req));

  review.status = 'flagged';
  review.flagCount = (review.flagCount || 0) + 1;
  await review.save();

  await auditOwner(req, session, 'owner.review.reported', {
    targetType: 'Review',
    targetId: review._id,
    meta: { hostelId: String(hostel._id), reason },
  });

  return ok({ review: serialize(review.toObject()) });
});
