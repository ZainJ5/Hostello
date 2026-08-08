import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import Review from '@/models/Review';
import { recomputeHostelRating } from '../../_lib/rating';

/** Flags needed before a review is pulled from public view for moderation. */
const AUTO_FLAG_THRESHOLD = 3;

const schema = z.object({
  reason: z.string().trim().max(200).default(''),
});

function badId(id) {
  return !/^[a-f\d]{24}$/i.test(String(id || ''));
}

/**
 * POST /api/reviews/[id]/flag — report a review as abusive or fake.
 *
 * Rate limited to one flag per user per review per day, which makes the call
 * effectively idempotent: a double-click, or a retry after a dropped
 * connection, cannot inflate `flagCount`. Once the threshold is reached the
 * review moves to `flagged`, drops out of the public listing and out of the
 * hostel's average — so the rating is recomputed here too.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');
  const { id } = await ctx.params;
  if (badId(id)) return fail('Review not found', 404);

  await readJson(req).then((raw) => schema.parse(raw));

  const review = await Review.findById(id).select('studentId status flagCount hostelId');
  if (!review) return fail('Review not found', 404);

  if (String(review.studentId) === String(session.userId)) {
    return fail('You cannot flag your own review', 400);
  }

  if (review.status !== 'published') {
    // Already flagged or removed — treat as a no-op success so the UI settles.
    return ok({ flagged: true, alreadyReported: true });
  }

  enforceRateLimit(`review:flag:${session.userId}:${id}`, {
    max: 1,
    windowMs: 24 * 60 * 60 * 1000,
  });

  review.flagCount += 1;
  const hidden = review.flagCount >= AUTO_FLAG_THRESHOLD;
  if (hidden) review.status = 'flagged';
  await review.save();

  if (hidden) {
    // The review no longer counts towards the listing's public score.
    await recomputeHostelRating(review.hostelId);
  }

  return ok({ flagged: true, hidden });
});
