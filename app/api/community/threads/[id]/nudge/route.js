import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import AskThread from '@/models/AskThread';
import { idSchema } from '../../../_lib/schema';

/**
 * POST /api/community/threads/[id]/nudge: remind residents a question is open.
 *
 * A NUDGE DOES NOT NAME YOU. Only the total is stored, never who sent it, so
 * there is nothing to leak later and no way to work out who is asking about
 * the gate timing at a particular building. The page says this out loud in a
 * panel next to the control, because a student has to be able to believe it
 * before they will use it.
 *
 * The rate limit is one nudge per student per question per day, which also
 * makes the call idempotent: a double tap or a retry after a dropped
 * connection cannot inflate the count.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student');

  const { id } = await ctx.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail('Question not found', 404);

  enforceRateLimit(`community:nudge:${session.userId}:${id}`, {
    max: 1,
    windowMs: 24 * 60 * 60 * 1000,
  });

  const thread = await AskThread.findOneAndUpdate(
    { _id: id, status: 'open' },
    { $inc: { nudgeCount: 1 } },
    { new: true, projection: 'nudgeCount' }
  ).lean();

  if (!thread) {
    // Either gone or already answered. Both are a no-op rather than an error,
    // so the button settles instead of shouting at somebody being helpful.
    return ok({ nudged: false, alreadyAnswered: true });
  }

  return ok({ nudged: true, nudgeCount: thread.nudgeCount });
});
