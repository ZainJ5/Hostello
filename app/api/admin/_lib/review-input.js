import mongoose from 'mongoose';
import { z } from 'zod';

const score = z.coerce.number().int().min(1).max(5);
const optionalScore = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || v === 0 ? null : v),
  score.nullable()
);

/** Fields an admin can set when adding or editing a review. */
export const reviewInput = z.object({
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
  ownerReply: z.string().trim().max(2000).optional(),
  date: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Not a valid date'),
});

export function reviewDate(input) {
  if (!input.date) return null;
  const when = new Date(input.date);
  return when > new Date() ? 'future' : when;
}
