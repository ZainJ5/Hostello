import { connectDB } from '@/lib/db';
import { handler, ok } from '@/lib/api';
import { getSession, destroySession } from '@/lib/auth';
import User from '@/models/User';
import { publicUser } from '../_lib/users';

/**
 * GET /api/auth/me
 *
 * Returns `{ user: null }` with a 200 when signed out — "not signed in" is a
 * normal answer, not an error, and callers shouldn't need a try/catch to ask.
 *
 * The record is re-read from the database rather than trusted from the JWT, so
 * a suspended or deleted account stops working immediately instead of when its
 * 30-day token expires. `passwordHash` is `select: false`, so it is never
 * loaded here; `publicUser` allow-lists the fields regardless.
 */
export const GET = handler(async () => {
  const session = await getSession();
  if (!session) return ok({ user: null });

  await connectDB();
  const user = await User.findById(session.userId).lean();

  if (!user || user.status === 'suspended') {
    await destroySession();
    return ok({ user: null });
  }

  return ok({ user: publicUser(user) });
});
