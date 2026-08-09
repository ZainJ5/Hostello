import { z } from 'zod';

import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import RoommateIntro from '@/models/RoommateIntro';
import RoommateProfile from '@/models/RoommateProfile';

/**
 * Answering an introduction request.
 *
 * Only the recipient may answer, and the recipient is taken from the session
 * and matched against the document, so an id in the path can only ever reach a
 * request that was addressed to the caller.
 *
 * Three answers and no more:
 *
 *   accept  both sides see it, and whatever each of them chose to be reached
 *           on becomes visible to the other.
 *   ignore  recorded here so the request leaves the caller's list. The sender
 *           is never told, and their view is identical to one nobody opened.
 *   block   the same silence, plus the sender is removed from the caller's
 *           matching for good, in both directions.
 *
 * Nothing here places anybody in a room. Accepting an intro is an
 * introduction and that is all it is.
 */

const OID = /^[a-f\d]{24}$/i;

const actionSchema = z.object({
  action: z.enum(['accept', 'ignore', 'block', 'read']),
});

export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  enforceRateLimit(`roommate-intro-reply:${session.userId}:${clientIp(req)}`, {
    max: 60,
    windowMs: 60_000,
  });

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('That request could not be found', 400);

  const body = actionSchema.parse(await readJson(req));

  // Scoped by recipient in the query itself, so there is no window between
  // reading the document and checking who owns it.
  const intro = await RoommateIntro.findOne({ _id: id, toStudentId: session.userId });
  if (!intro) return fail('That request could not be found', 404);

  if (body.action === 'read') {
    if (!intro.readAt) {
      intro.readAt = new Date();
      await intro.save();
    }
    return ok({ id: String(intro._id), status: intro.status });
  }

  if (intro.status !== 'sent') {
    return ok({ id: String(intro._id), status: intro.status, changed: false });
  }

  intro.status = body.action === 'accept' ? 'accepted' : body.action === 'block' ? 'blocked' : 'ignored';
  intro.decidedAt = new Date();
  if (!intro.readAt) intro.readAt = intro.decidedAt;
  await intro.save();

  if (body.action === 'block') {
    // A block is a matching rule, not a message. It is applied in the
    // pipeline in both directions, so neither student is scored against the
    // other again and neither is told.
    await RoommateProfile.updateOne(
      { studentId: session.userId },
      { $addToSet: { blocked: intro.fromStudentId } }
    );
  }

  return ok({ id: String(intro._id), status: intro.status, changed: true });
});
