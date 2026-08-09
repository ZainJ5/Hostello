import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail } from '@/lib/api';
import {
  canMatch,
  countCandidates,
  ensureOwnProfile,
  findMatches,
} from '@/components/roommates/query';

/**
 * Students on the same campus, of the same gender, who have answered all six.
 *
 * Every document in the response has been through the pipeline's `$project`,
 * so it carries six per axis verdicts and not one answer. Read
 * components/roommates/query.js before changing anything here.
 */
export const GET = handler(async () => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const me = await ensureOwnProfile(session);
  if (!me) return fail('Sign in to continue', 401);

  if (!canMatch(me)) {
    return ok({
      matches: [],
      ready: false,
      answeredCount: me.answeredCount || 0,
      campus: me.campus || '',
      gender: me.gender || '',
      candidates: 0,
    });
  }

  const [matches, candidates] = await Promise.all([findMatches(me), countCandidates(me)]);

  return ok({
    matches,
    ready: true,
    answeredCount: me.answeredCount || 0,
    campus: me.campus,
    gender: me.gender,
    candidates,
  });
});
