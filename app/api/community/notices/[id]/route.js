import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import NoticePost from '@/models/NoticePost';
import { idSchema } from '../../_lib/schema';

/**
 * DELETE /api/community/notices/[id]: take your own post down early.
 *
 * The seats filled, the lamp sold, the bottle turned up. Every post already
 * expires on its own, so this is only ever about being early, which is why it
 * is a hard delete rather than a status change: there is nothing to keep and
 * the TTL index would have removed the row anyway.
 *
 * Only the author. An admin take-down belongs in the moderation queue that is
 * not being built here, so it is not smuggled in as a role check.
 */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student');

  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return fail('Post not found', 404);

  enforceRateLimit(`community:notice:delete:${session.userId}`, {
    max: 30,
    windowMs: 60 * 60 * 1000,
  });

  const res = await NoticePost.deleteOne({ _id: id, authorId: session.userId });
  if (res.deletedCount === 0) return fail('Post not found', 404);

  return ok({ removed: true });
});
