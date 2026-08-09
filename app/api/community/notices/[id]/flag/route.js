import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import NoticePost, { AUTO_FLAG_THRESHOLD } from '@/models/NoticePost';
import { flagSchema, idSchema } from '../../../_lib/schema';

/**
 * POST /api/community/notices/[id]/flag: report a post on the board.
 *
 * Same threshold as reviews and as the ask threads: three reports and it drops
 * out of view. On a board that only residents can read, three separate
 * residents objecting is a strong enough signal to act on without waiting for
 * a human, and the post was going to expire on its own regardless.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return fail('Post not found', 404);

  const { reason } = flagSchema.parse(await readJson(req));
  void reason; // Nowhere to store it until the moderation queue exists.

  const post = await NoticePost.findById(id).select('authorId status flagCount');
  if (!post) return fail('Post not found', 404);

  if (String(post.authorId) === String(session.userId)) {
    return fail('You cannot report your own post', 400);
  }
  if (post.status !== 'published') {
    return ok({ flagged: true, alreadyReported: true });
  }

  enforceRateLimit(`community:flag:${session.userId}:${id}`, {
    max: 1,
    windowMs: 24 * 60 * 60 * 1000,
  });

  post.flagCount += 1;
  const hidden = post.flagCount >= AUTO_FLAG_THRESHOLD;
  if (hidden) post.status = 'flagged';
  await post.save();

  return ok({ flagged: true, hidden });
});
