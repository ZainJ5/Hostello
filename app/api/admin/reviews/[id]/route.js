import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import Review from '@/models/Review';
import Hostel from '@/models/Hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { recomputeHostelRating } from '@/app/api/admin/_lib/reviews';
import { serialize } from '@/lib/utils';
import { reviewDate, reviewInput } from '@/app/api/admin/_lib/review-input';

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

  const body = await readJson(req);
  const { action, note } = body;
  if (action === 'edit') return editReview(req, session, id, body);
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
  // Approving clears the report counter, since the flag has been adjudicated.
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

const EDITABLE = [
  'hostelId',
  'studentName',
  'rating',
  'cleanliness',
  'food',
  'security',
  'location',
  'valueForMoney',
  'title',
  'comment',
  'status',
  'ownerReply',
];

/** Full edit from the admin form. Both the old and new listing are re-rated. */
async function editReview(req, session, id, body) {
  const review = await Review.findById(id);
  if (!review) return fail('That review no longer exists', 404);

  const input = reviewInput.parse(body.review || {});
  const when = reviewDate(input);
  if (when === 'future') return fail('The review date cannot be in the future', 422);

  const hostel = await Hostel.findById(input.hostelId).select('name').lean();
  if (!hostel) return fail('That listing no longer exists', 404);

  const before = {};
  const changed = [];
  const oldHostelId = review.hostelId;
  for (const key of EDITABLE) {
    if (input[key] === undefined) continue;
    const prev = review[key] == null ? null : String(review[key]);
    const next = input[key] == null ? null : String(input[key]);
    if (prev !== next) {
      before[key] = review[key];
      changed.push(key);
      review[key] = input[key];
    }
  }
  if (changed.includes('ownerReply')) {
    review.ownerRepliedAt = input.ownerReply ? review.ownerRepliedAt || new Date() : null;
  }
  if (when && String(review.createdAt?.toISOString?.().slice(0, 10)) !== input.date) {
    before.createdAt = review.createdAt;
    changed.push('date');
  }

  if (!changed.length) {
    return ok({ unchanged: true, review: serialize(review.toObject()) });
  }
  await review.save();
  // createdAt is immutable through Mongoose, so a corrected date goes straight
  // to the collection.
  if (changed.includes('date')) {
    await Review.collection.updateOne({ _id: review._id }, { $set: { createdAt: when } });
    review.createdAt = when;
  }

  const totals = await recomputeHostelRating(review.hostelId);
  if (String(oldHostelId) !== String(review.hostelId)) {
    await recomputeHostelRating(oldHostelId);
  }

  await writeAudit(req, session, {
    action: 'review.edit',
    targetType: 'Review',
    targetId: review._id,
    meta: {
      hostel: hostel.name,
      hostelId: String(review.hostelId),
      student: review.studentName,
      changed,
      before,
      recomputed: totals,
    },
  });

  return ok({ review: serialize(review.toObject()), ...totals });
}

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
