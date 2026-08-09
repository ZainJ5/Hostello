import { z } from 'zod';

import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import RoommateIntro from '@/models/RoommateIntro';
import {
  canMatch,
  ensureOwnProfile,
  findMatch,
  loadIntros,
} from '@/components/roommates/query';

/**
 * Introduction requests.
 *
 * An intro is the whole product. Hostello never places anybody: it hands one
 * student's message to another, and that student accepts it, ignores it or
 * blocks. There is no chat here, no allocation and no room assignment.
 *
 * Shaping is explicit in both directions, and the two directions are shaped
 * differently on purpose:
 *
 *   received  the sender's display name, year and programme, plus the message.
 *   sent      the recipient's display name, and whether they accepted. Never
 *             whether they read it, ignored it or blocked, because a refusal
 *             that reports itself is not a refusal a student can make safely.
 */

const sendSchema = z.object({
  profileId: z.string().regex(/^[a-f\d]{24}$/i, 'That student could not be found'),
  message: z.string().trim().min(1, 'Write a line or two first').max(500),
});

export const GET = handler(async () => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  // Shaped in query.js, which the matches page also calls, so there is one
  // definition of what a sender is allowed to learn rather than two.
  return ok(await loadIntros(session.userId));
});

export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  enforceRateLimit(`roommate-intro:${session.userId}:${clientIp(req)}`, {
    max: 10,
    windowMs: 60 * 60_000,
  });

  const body = sendSchema.parse(await readJson(req));

  const me = await ensureOwnProfile(session);
  if (!me) return fail('Sign in to continue', 401);
  if (!canMatch(me)) {
    return fail('Answer all six questions before asking for an intro', 409);
  }

  // Routed through the matching pipeline rather than a direct findById, so a
  // student off campus, of another gender, blocked either way, or hidden, is
  // not reachable by pasting an id into the address bar.
  const target = await findMatch(me, body.profileId);
  if (!target) return fail('That student is not someone we can introduce you to', 404);

  const now = new Date();
  await RoommateIntro.findOneAndUpdate(
    { fromStudentId: session.userId, toStudentId: target.studentId },
    {
      $set: {
        message: body.message,
        fromDisplayName: me.displayName || '',
        fromInitials: me.initials || '',
        fromYear: me.year || '',
        fromProgramme: me.programme || '',
      },
      // A resend never reopens a decision somebody already made.
      $setOnInsert: { status: 'sent', createdAt: now },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return ok({ sent: true, profileId: target.id });
});
