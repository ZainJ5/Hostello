import { handler, ok, fail, readJson } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Review from '@/models/Review';
import Hostel from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import { reviewReplySchema } from '@/components/owner/schemas';
import { assertOwned, objectIdOr404 } from '@/app/(owner)/_lib/owner-data';
import { auditOwner } from '@/app/(owner)/_lib/audit';

async function loadOwnedReview(id, session) {
  const review = await Review.findById(objectIdOr404(id, 'review'));
  if (!review) return null;
  const hostel = await Hostel.findById(review.hostelId).select('ownerId name');
  // Ownership travels through the hostel, exactly as it does for bookings.
  assertOwned(hostel, session, 'review');
  return { review, hostel };
}

/** Publishes the owner's public reply under a review. */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;

  const loaded = await loadOwnedReview(id, session);
  if (!loaded) return fail('That review no longer exists', 404);
  const { review, hostel } = loaded;

  if (review.status === 'removed') {
    return fail('This review was removed by a moderator and cannot be replied to.', 409);
  }

  const { reply } = reviewReplySchema.parse(await readJson(req));
  review.ownerReply = reply;
  review.ownerRepliedAt = new Date();
  await review.save();

  await auditOwner(req, session, 'owner.review.replied', {
    targetType: 'Review',
    targetId: review._id,
    meta: { hostelId: String(hostel._id) },
  });

  return ok({ review: serialize(review.toObject()) });
});

/** Retracts a reply. The review itself is untouched. */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;

  const loaded = await loadOwnedReview(id, session);
  if (!loaded) return fail('That review no longer exists', 404);
  const { review } = loaded;

  review.ownerReply = '';
  review.ownerRepliedAt = null;
  await review.save();

  await auditOwner(req, session, 'owner.review.reply_removed', {
    targetType: 'Review',
    targetId: review._id,
  });

  return ok({ review: serialize(review.toObject()) });
});
