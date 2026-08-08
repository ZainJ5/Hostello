import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

/** Every signed-in role may use the account area; only signed-out is bounced. */
const ALLOWED_ROLES = ['student', 'owner', 'admin'];

/**
 * Page-level guard for `/dashboard/**`.
 *
 * `proxy.js` already blocks these routes, but a proxy is a convenience, not a
 * security boundary — a route that renders a student's bookings must prove for
 * itself who is asking. Every page in this group calls this first and then
 * scopes every query by the id it returns, so one student's session can never
 * read another's rows.
 *
 * Redirects (rather than throwing a 403) so a signed-out student lands on the
 * login form and is returned to the page they wanted.
 */
export async function requireStudentSession(nextPath = '/dashboard') {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!ALLOWED_ROLES.includes(session.role)) redirect('/');
  return session;
}

/**
 * The guard plus the caller's own user document. Pages read the profile from
 * the database rather than the JWT so an edit made a second ago is reflected
 * immediately instead of after the next sign-in.
 */
export async function requireStudentUser(nextPath = '/dashboard', fields = '') {
  const session = await requireStudentSession(nextPath);
  await connectDB();

  const user = await User.findById(session.userId)
    .select(fields || 'name email phone university city gender avatar savedHostels role')
    .lean();

  // Session valid but the account is gone (deleted in another tab) — start over.
  if (!user) redirect('/login');

  return { session, user };
}
