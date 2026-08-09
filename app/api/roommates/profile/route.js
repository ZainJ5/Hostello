import { z } from 'zod';

import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import RoommateProfile, { GENDERS, YEARS } from '@/models/RoommateProfile';
import { CAMPUS_NAMES } from '@/components/hostels/campuses';
import { AXES } from '@/components/roommates/questions';
import { ensureOwnProfile, loadOwnProfile } from '@/components/roommates/query';

/**
 * The caller's own roommate profile.
 *
 * This is the one route in the feature that is allowed to return the six
 * answers, and only ever the caller's own. Nothing here takes a student id
 * from the request: the id comes from the session and from nowhere else, so
 * there is no parameter to tamper with.
 */

const detailsSchema = z.object({
  campus: z.enum(CAMPUS_NAMES).or(z.literal('')).optional(),
  gender: z.enum(GENDERS).or(z.literal('')).optional(),
  year: z.enum(YEARS).or(z.literal('')).optional(),
  programme: z.string().trim().max(60).optional(),
  note: z.string().trim().max(240).optional(),
  looking: z.string().trim().max(90).optional(),
  contact: z.string().trim().max(80).optional(),
  visible: z.boolean().optional(),
});

/** Shapes the caller's own document. Answers included, because they are theirs. */
function ownPayload(profile) {
  const answers = {};
  for (const axis of AXES) {
    const value = profile?.answers?.[axis];
    answers[axis] = typeof value === 'number' ? value : null;
  }
  return {
    campus: profile?.campus || '',
    gender: profile?.gender || '',
    year: profile?.year || '',
    programme: profile?.programme || '',
    note: profile?.note || '',
    looking: profile?.looking || '',
    contact: profile?.contact || '',
    displayName: profile?.displayName || '',
    initials: profile?.initials || '',
    visible: profile?.visible !== false,
    answers,
    answeredCount: profile?.answeredCount || 0,
    complete: Boolean(profile?.complete),
    answersUpdatedAt: profile?.answersUpdatedAt || null,
  };
}

export const GET = handler(async () => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const profile = await ensureOwnProfile(session);
  if (!profile) return fail('Sign in to continue', 401);

  return ok({ profile: ownPayload(profile) });
});

export const PATCH = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  enforceRateLimit(`roommate-profile:${session.userId}:${clientIp(req)}`, {
    max: 60,
    windowMs: 60_000,
  });

  const body = detailsSchema.parse(await readJson(req));

  await ensureOwnProfile(session);

  // Loaded without `+answers`: this route has no business reading them, and a
  // save that never selected them cannot overwrite them either.
  const profile = await RoommateProfile.findOne({ studentId: session.userId });
  if (!profile) return fail('Sign in to continue', 401);

  for (const key of Object.keys(detailsSchema.shape)) {
    if (body[key] !== undefined) profile[key] = body[key];
  }
  await profile.save();

  return ok({ profile: ownPayload(await loadOwnProfile(session.userId)) });
});
