import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, created, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import User from '@/models/User';
import AskThread from '@/models/AskThread';
import { answerCreateSchema, idSchema } from '../../../_lib/schema';
import { shapeAnswer } from '../../../_lib/shape';
import { livesAt } from '../../../_lib/residency';

/**
 * POST /api/community/threads/[id]/answers: answer a question.
 *
 * ONLY RESIDENTS ANSWER. The page tells the reader that in its first sentence
 * and it is the only reason these answers are worth more than a comment
 * section, so it is enforced here on every write and not merely by hiding the
 * form. See `_lib/residency.js` for what counts as living somewhere.
 *
 * One answer per student per thread. A resident who wants to say more edits
 * their answer rather than stacking replies, which keeps a thread readable to
 * the person who arrives from a search result six months later.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student');

  const { id } = await ctx.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return fail('Question not found', 404);

  enforceRateLimit(`community:answer:${session.userId}`, {
    max: 20,
    windowMs: 60 * 60 * 1000,
  });

  const body = answerCreateSchema.parse(await readJson(req));

  const thread = await AskThread.findById(id).select(
    'hostelId status answers answerCount'
  );
  if (!thread || thread.status === 'hidden') return fail('Question not found', 404);

  const resident = await livesAt(session.userId, thread.hostelId);
  if (!resident) {
    return fail(
      'Only students living at this hostel can answer. That is what makes these answers worth reading',
      403
    );
  }

  const already = thread.answers.find(
    (a) => String(a.authorId) === String(session.userId) && a.status !== 'removed'
  );
  if (already) {
    return fail('You have already answered this one. Edit your answer instead', 409, {
      answerId: String(already._id),
    });
  }

  const user = await User.findById(session.userId).select('name').lean();

  thread.answers.push({
    body: body.body,
    authorId: session.userId,
    authorName: user?.name || '',
    status: 'published',
  });

  thread.answerCount = thread.answers.filter((a) => a.status === 'published').length;
  thread.lastAnswerAt = new Date();
  thread.status = 'answered';
  await thread.save();

  const answer = thread.answers[thread.answers.length - 1];
  return created({ answer: shapeAnswer(answer) });
});
