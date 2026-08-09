import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import AskThread, { AUTO_FLAG_THRESHOLD } from '@/models/AskThread';
import { flagSchema, idSchema } from '../../../_lib/schema';

/**
 * POST /api/community/threads/[id]/flag: report a question, or one answer on
 * it by passing `answerId`.
 *
 * Three flags hides it, which is the threshold reviews already use. Reusing it
 * rather than picking a new number means moderation behaves the same way
 * everywhere on the site, and a student who has reported a review once already
 * knows what reporting an answer will do.
 *
 * One report per student per target per day, so the count cannot be inflated
 * by a double tap, and a single account cannot hide anything on its own.
 *
 * WHAT THIS DOES NOT DO: there is no moderation queue. Hidden content is
 * simply hidden, and nobody is notified. The admin console is frozen for this
 * work, so the queue that should sit behind this is listed in the report
 * rather than built.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return fail('Not found', 404);

  const raw = await readJson(req);
  const { reason } = flagSchema.parse(raw);
  const answerId = raw?.answerId ? String(raw.answerId) : '';
  if (answerId && !idSchema.safeParse(answerId).success) return fail('Not found', 404);

  void reason; // Stored nowhere today: see the note about the frozen console.

  const thread = await AskThread.findById(id).select(
    'askedBy status flagCount answers answerCount'
  );
  if (!thread) return fail('Not found', 404);

  // ── One answer ──
  if (answerId) {
    const answer = thread.answers.id(answerId);
    if (!answer) return fail('Not found', 404);

    if (String(answer.authorId) === String(session.userId)) {
      return fail('You cannot report your own answer', 400);
    }
    if (answer.status !== 'published') {
      return ok({ flagged: true, alreadyReported: true });
    }

    enforceRateLimit(`community:flag:${session.userId}:${answerId}`, {
      max: 1,
      windowMs: 24 * 60 * 60 * 1000,
    });

    answer.flagCount += 1;
    const hidden = answer.flagCount >= AUTO_FLAG_THRESHOLD;
    if (hidden) answer.status = 'flagged';

    thread.answerCount = thread.answers.filter((a) => a.status === 'published').length;
    if (thread.answerCount === 0 && thread.status === 'answered') thread.status = 'open';
    await thread.save();

    return ok({ flagged: true, hidden });
  }

  // ── The question itself ──
  if (String(thread.askedBy) === String(session.userId)) {
    return fail('You cannot report your own question', 400);
  }
  if (thread.status === 'hidden') {
    return ok({ flagged: true, alreadyReported: true });
  }

  enforceRateLimit(`community:flag:${session.userId}:${id}`, {
    max: 1,
    windowMs: 24 * 60 * 60 * 1000,
  });

  thread.flagCount += 1;
  const hidden = thread.flagCount >= AUTO_FLAG_THRESHOLD;
  if (hidden) thread.status = 'hidden';
  await thread.save();

  return ok({ flagged: true, hidden });
});
