import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { serialize } from '@/lib/utils';
import Review from '@/models/Review';
import { recomputeHostelRating } from '../_lib/rating';
import { normaliseSubScores, reviewUpdateSchema } from '../_lib/schema';

function badId(id) {
  return !/^[a-f\d]{24}$/i.test(String(id || ''));
}

/**
 * PATCH /api/reviews/[id] — edit your own review.
 * Scoped by `studentId`, so the id in the URL can only ever reach a row the
 * caller wrote. A review an admin has `removed` is frozen: editing it would
 * quietly undo a moderation decision.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');
  const { id } = await ctx.params;
  if (badId(id)) return fail('Review not found', 404);

  const body = reviewUpdateSchema.parse(normaliseSubScores(await readJson(req)));

  const review = await Review.findOne({ _id: id, studentId: session.userId });
  if (!review) return fail('Review not found', 404);

  if (review.status === 'removed') {
    return fail('This review was removed by a moderator and can no longer be edited', 403);
  }

  review.rating = body.rating;
  review.title = body.title;
  review.comment = body.comment;
  review.cleanliness = body.cleanliness;
  review.food = body.food;
  review.security = body.security;
  review.location = body.location;
  review.valueForMoney = body.valueForMoney;
  await review.save();

  // Rating changed, so the listing average must be rebuilt from the rows.
  const totals = await recomputeHostelRating(review.hostelId);

  return ok({ review: serialize(review.toObject()), hostel: totals });
});

/** DELETE /api/reviews/[id] — remove your own review, then rebuild the average. */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');
  const { id } = await ctx.params;
  if (badId(id)) return fail('Review not found', 404);

  const review = await Review.findOneAndDelete({
    _id: id,
    studentId: session.userId,
  }).lean();

  if (!review) return fail('Review not found', 404);

  const totals = await recomputeHostelRating(review.hostelId);

  return ok({ deleted: true, hostel: totals });
});
