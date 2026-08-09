import { z } from 'zod';
import { MIN_REVIEW_LENGTH, REVIEW_SUBSCORES } from '@/components/student/constants';

export const SUBSCORE_KEYS = REVIEW_SUBSCORES.map((s) => s.key);

const subScore = z.number().int().min(1).max(5).nullable();

const body = {
  rating: z.coerce.number().int().min(1, 'Pick a star rating').max(5),
  title: z.string().trim().max(120, 'Keep the headline under 120 characters').default(''),
  comment: z
    .string()
    .trim()
    .min(
      MIN_REVIEW_LENGTH,
      `Tell other students a little more: at least ${MIN_REVIEW_LENGTH} characters`
    )
    .max(2000, 'Keep your review under 2000 characters'),
  cleanliness: subScore,
  food: subScore,
  security: subScore,
  location: subScore,
  valueForMoney: subScore,
};

export const reviewCreateSchema = z.object({
  hostelId: z.string().regex(/^[a-f\d]{24}$/i, 'That listing could not be found'),
  ...body,
});

export const reviewUpdateSchema = z.object(body);

/**
 * Sub-scores arrive from a `<select>` as `''` when the student skips one.
 * Normalising before parse keeps the schema itself a plain "integer 1-5 or
 * null", which is exactly what the model stores.
 */
export function normaliseSubScores(raw) {
  const out = { ...raw };
  for (const key of SUBSCORE_KEYS) {
    const v = out[key];
    out[key] = v === '' || v === null || v === undefined ? null : Number(v);
  }
  return out;
}
