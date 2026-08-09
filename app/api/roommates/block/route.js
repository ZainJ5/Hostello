import { z } from 'zod';

import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import RoommateProfile from '@/models/RoommateProfile';
import RoommateIntro from '@/models/RoommateIntro';
import { ensureOwnProfile, findMatch } from '@/components/roommates/query';

/**
 * Blocking somebody without an intro in the way.
 *
 * The intro page puts Block beside Send, because the moment a student decides
 * they do not want to be suggested to somebody is often before any message
 * exists. It is silent: the other student is told nothing and simply stops
 * appearing, in both directions.
 */

const blockSchema = z.object({
  profileId: z.string().regex(/^[a-f\d]{24}$/i, 'That student could not be found'),
});

export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  enforceRateLimit(`roommate-block:${session.userId}:${clientIp(req)}`, {
    max: 30,
    windowMs: 60 * 60_000,
  });

  const body = blockSchema.parse(await readJson(req));

  const me = await ensureOwnProfile(session);
  if (!me) return fail('Sign in to continue', 401);

  // Resolved through the pipeline, so only somebody the caller could actually
  // have been shown can be blocked.
  const target = await findMatch(me, body.profileId);
  if (!target) return fail('That student could not be found', 404);

  await RoommateProfile.updateOne(
    { studentId: session.userId },
    { $addToSet: { blocked: target.studentId } }
  );

  // Any request they already sent leaves the caller's list too.
  await RoommateIntro.updateOne(
    { fromStudentId: target.studentId, toStudentId: session.userId, status: 'sent' },
    { $set: { status: 'blocked', decidedAt: new Date() } }
  );

  return ok({ blocked: true });
});
