import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';

/**
 * Page-level guard. `proxy.js` already blocks non-admins at the edge; this is
 * the second lock, so a routing mistake can never render admin data. Route
 * handlers call `requireRole('admin')` directly — they want the 401/403, not
 * a redirect.
 */
export async function requireAdminPage() {
  let session = null;
  try {
    session = await requireRole('admin');
  } catch (err) {
    // Only 401/403 mean "not an admin". Anything else (a dynamic-rendering
    // bailout, a thrown redirect) must keep propagating.
    if (!err?.status) throw err;
    session = null;
  }
  if (!session) redirect('/login?next=/admin');
  await connectDB();
  return session;
}
