import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

/** Every signed-in role may use the account area; only signed-out is bounced. */
const ALLOWED_ROLES = ['student', 'owner', 'admin'];

/**
 * Page-level guard for `/account/**`.
 *
 * This is the authorisation boundary and always was: a route that renders a
 * student's own rows must prove for itself who is asking. Every page in this
 * group calls this first and then scopes every query by the id it returns, so
 * one student's session can never read another's rows.
 *
 * NOTE. `proxy.js` still matches `/dashboard/:path*` and not `/account/:path*`,
 * because the proxy is outside this agent's scope. Nothing is unprotected,
 * since the guard below runs in the layout before any page fetches anything,
 * but the optimistic pre-render check no longer fires for these routes. The
 * matcher needs `/account/:path*` adding centrally.
 *
 * Redirects (rather than throwing a 403) so a signed-out student lands on the
 * login form and is returned to the page they wanted.
 */
export async function requireStudentSession(nextPath = '/account') {
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
export async function requireStudentUser(nextPath = '/account', fields = '') {
  const session = await requireStudentSession(nextPath);
  await connectDB();

  const user = await User.findById(session.userId)
    .select(fields || 'name email phone university city gender avatar savedHostels role')
    .lean();

  // Session valid but the account is gone (deleted in another tab). Start over.
  if (!user) redirect('/login');

  return { session, user };
}
