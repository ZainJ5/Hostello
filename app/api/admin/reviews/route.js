import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import Review from '@/models/Review';
import Hostel from '@/models/Hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { ensureReviewIndexes, recomputeHostelRating } from '@/app/api/admin/_lib/reviews';
import { serialize } from '@/lib/utils';

const score = z.coerce.number().int().min(1).max(5);
const optionalScore = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  score.nullable()
);

const reviewInput = z.object({
  hostelId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Pick a listing'),
  studentName: z.string().trim().min(2, 'Add the reviewer name').max(80),
  rating: score,
  cleanliness: optionalScore.optional(),
  food: optionalScore.optional(),
  security: optionalScore.optional(),
  location: optionalScore.optional(),
  valueForMoney: optionalScore.optional(),
  title: z.string().trim().max(120).optional().default(''),
  comment: z.string().trim().min(10, 'Write at least a sentence').max(2000),
  status: z.enum(['published', 'flagged', 'removed']).optional().default('published'),
  date: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Not a valid date'),
});

/** Admin-entered review, for feedback collected outside the site. */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');
  await ensureReviewIndexes();

  const input = reviewInput.parse(await readJson(req));
  const hostel = await Hostel.findById(input.hostelId).select('name').lean();
  if (!hostel) return fail('That listing no longer exists', 404);

  const when = input.date ? new Date(input.date) : null;
  if (when && when > new Date()) return fail('The review date cannot be in the future', 422);

  const fields = { ...input };
  delete fields.date;
  const doc = new Review({
    ...fields,
    studentId: null,
    source: 'admin',
    addedBy: session?.userId || null,
  });
  if (when) {
    doc.createdAt = when;
    doc.updatedAt = when;
  }
  await doc.save({ timestamps: !when });

  const totals = await recomputeHostelRating(doc.hostelId);

  await writeAudit(req, session, {
    action: 'review.create',
    targetType: 'Review',
    targetId: doc._id,
    meta: {
      hostel: hostel.name,
      hostelId: String(doc.hostelId),
      student: doc.studentName,
      stars: doc.rating,
      status: doc.status,
      recomputed: totals,
    },
  });

  return ok({ review: serialize(doc.toObject()), ...totals }, { status: 201 });
});
