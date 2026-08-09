import { z } from 'zod';

import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { AXES, isValidAnswer } from '@/components/roommates/questions';
import {
  ensureOwnProfile,
  loadOwnProfile,
  loadOwnProfileDoc,
} from '@/components/roommates/query';

/**
 * Autosave for one answer.
 *
 * The questionnaire is one page, not a stepper, and it has no submit button:
 * every answer is written the moment it is picked. That is why this route
 * takes a single axis rather than the whole form. A student can close the tab
 * mid question and come back on their phone with everything they had.
 *
 * It only ever writes the caller's own document. There is no student id in the
 * request to point somewhere else.
 */

const answerSchema = z.object({
  axis: z.enum(AXES),
  // null clears an answer, which is how a student takes one back.
  value: z.number().int().nullable(),
});

export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  // Generous, because one deliberate pass through the form is six writes and a
  // student changing their mind is a few more. Still bounded.
  enforceRateLimit(`roommate-answer:${session.userId}:${clientIp(req)}`, {
    max: 120,
    windowMs: 60_000,
  });

  const body = answerSchema.parse(await readJson(req));

  if (body.value !== null && !isValidAnswer(body.axis, body.value)) {
    return fail('That is not one of the answers to this question', 422);
  }

  await ensureOwnProfile(session);

  // Goes through the loader in query.js rather than naming `+answers` here, so
  // every selection of that field stays in one file.
  const profile = await loadOwnProfileDoc(session.userId);
  if (!profile) return fail('Sign in to continue', 401);

  profile.answers = profile.answers || {};
  profile.answers[body.axis] = body.value;
  profile.markModified('answers');
  await profile.save();

  const saved = await loadOwnProfile(session.userId);

  return ok({
    axis: body.axis,
    value: body.value,
    answeredCount: saved?.answeredCount || 0,
    complete: Boolean(saved?.complete),
    answersUpdatedAt: saved?.answersUpdatedAt || null,
  });
});
