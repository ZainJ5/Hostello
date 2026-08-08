import { handler, ok } from '@/lib/api';
import { destroySession } from '@/lib/auth';

/**
 * POST /api/auth/logout
 *
 * Clearing the cookie is the whole job — sessions are stateless JWTs, so there
 * is no server-side record to revoke. POST rather than GET so a `<img>` tag on
 * another site can't sign the user out.
 */
export const POST = handler(async () => {
  await destroySession();
  return ok({ ok: true });
});
