import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import Review from '@/models/Review';
import Hostel from '@/models/Hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { recomputeHostelRating } from '@/app/api/admin/_lib/reviews';
import { serialize } from '@/lib/utils';

const OID = /^[a-f0-9]{24}$/i;

const TRANSITIONS = {
  approve: 'published',
  remove: 'removed',
  restore: 'published',
};

export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid review id', 400);

  const { action, note } = await readJson(req);
  const next = TRANSITIONS[action];
  if (!next) return fail('Unknown review action', 422);

  const review = await Review.findById(id);
  if (!review) return fail('That review no longer exists', 404);

  if (review.status === next) {
    const totals = await recomputeHostelRating(review.hostelId);
    return ok({ alreadyDone: true, review: serialize(review.toObject()), ...totals });
  }

  const before = review.status;
  review.status = next;
  // Approving clears the report counter — the flag has been adjudicated.
  if (action === 'approve') review.flagCount = 0;
  await review.save();

  const totals = await recomputeHostelRating(review.hostelId);
  const hostel = await Hostel.findById(review.hostelId).select('name').lean();

  await writeAudit(req, session, {
    action: `review.${action}`,
    targetType: 'Review',
    targetId: review._id,
    meta: {
      before,
      after: next,
      hostel: hostel?.name || String(review.hostelId),
      hostelId: String(review.hostelId),
      student: review.studentName,
      stars: review.rating,
      note: note || '',
      recomputed: totals,
    },
  });

  return ok({ review: serialize(review.toObject()), ...totals });
});

export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid review id', 400);

  const review = await Review.findById(id).lean();
  if (!review) return ok({ deleted: false, alreadyGone: true });

  await Review.deleteOne({ _id: review._id });
  const totals = await recomputeHostelRating(review.hostelId);

  await writeAudit(req, session, {
    action: 'review.delete',
    targetType: 'Review',
    targetId: review._id,
    meta: {
      hostelId: String(review.hostelId),
      student: review.studentName,
      stars: review.rating,
      recomputed: totals,
    },
  });

  return ok({ deleted: true, ...totals });
});
