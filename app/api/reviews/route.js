import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, created, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { serialize } from '@/lib/utils';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import User from '@/models/User';
import { canReviewHostel } from './_lib/eligibility';
import { recomputeHostelRating } from './_lib/rating';
import { normaliseSubScores, reviewCreateSchema } from './_lib/schema';

/** GET /api/reviews: the caller's own reviews, newest first. */
export const GET = handler(async () => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const rows = await Review.find({ studentId: session.userId })
    .sort({ createdAt: -1 })
    .populate('hostelId', 'name slug city area images rating reviewCount status')
    .lean();

  return ok({ reviews: serialize(rows) });
});

/**
 * POST /api/reviews: write a review.
 *
 * Two gates before anything is written:
 *   1. eligibility: the student must hold a `confirmed` or `completed`
 *      booking on this hostel (see `_lib/eligibility.js` for the reasoning);
 *   2. uniqueness: the model carries a unique index on
 *      `{ hostelId, studentId }`, so one student gets one review per hostel.
 *      We pre-check so the message can name the fix, and still catch the
 *      duplicate-key error, because two tabs submitting at once slip past a
 *      read-then-write check.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  enforceRateLimit(`review:create:${session.userId}`, {
    max: 10,
    windowMs: 60 * 60 * 1000,
  });

  const body = reviewCreateSchema.parse(normaliseSubScores(await readJson(req)));

  const hostel = await Hostel.findById(body.hostelId).select('status name').lean();
  if (!hostel || hostel.status !== 'published') {
    return fail('This hostel is no longer listed', 404);
  }

  const eligible = await canReviewHostel(session.userId, body.hostelId);
  if (!eligible) {
    return fail(
      'Only students with a confirmed or completed booking at this hostel can review it',
      403
    );
  }

  const existing = await Review.findOne({
    hostelId: body.hostelId,
    studentId: session.userId,
  })
    .select('_id')
    .lean();

  if (existing) {
    return fail(
      "You've already reviewed this hostel. Edit your existing review instead",
      409,
      { reviewId: String(existing._id) }
    );
  }

  const user = await User.findById(session.userId).select('name').lean();

  let review;
  try {
    review = await Review.create({
      hostelId: body.hostelId,
      studentId: session.userId,
      studentName: user?.name || '',
      rating: body.rating,
      title: body.title,
      comment: body.comment,
      cleanliness: body.cleanliness,
      food: body.food,
      security: body.security,
      location: body.location,
      valueForMoney: body.valueForMoney,
      status: 'published',
    });
  } catch (err) {
    // Lost the race against another tab; the unique index caught it.
    if (err?.code === 11000) {
      return fail(
        "You've already reviewed this hostel. Edit your existing review instead",
        409
      );
    }
    throw err;
  }

  const totals = await recomputeHostelRating(body.hostelId);

  return created({ review: serialize(review.toObject()), hostel: totals });
});
