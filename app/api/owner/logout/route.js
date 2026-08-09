import { handler, ok } from '@/lib/api';
import { destroySession, requireRole } from '@/lib/auth';

/**
 * Sign-out for the owner console. Rather than call into `app/api/auth/**`, the
 * console clears its own session cookie through `destroySession()`, the same
 * helper the auth flow uses, so there is only one definition of what "signed
 * out" means.
 */
export const POST = handler(async () => {
  await requireRole('owner', 'admin');
  await destroySession();
  return ok({ ok: true });
});
