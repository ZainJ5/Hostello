import { connectDB } from '@/lib/db';
import { handler, ok, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { requireRole } from '@/lib/auth';
import { resendSchema } from '@/lib/validators/auth';
import User from '@/models/User';
import { issueCode, mailConfigured } from '../_lib/codes';

/**
 * POST /api/auth/resend — { email, purpose }
 *
 * Hard-limited to 3 per 10 minutes per address: this endpoint is the cheapest
 * way to turn the app into an email cannon aimed at someone else's inbox.
 *
 * The response never reveals whether the address is registered — the limiter
 * runs before the lookup, and the payload is identical either way.
 */
export const POST = handler(async (req) => {
  await connectDB();

  const ip = clientIp(req);
  const { email, purpose } = resendSchema.parse(await readJson(req));

  enforceRateLimit(`resend:email:${email}:${purpose}`, { max: 3, windowMs: 10 * 60_000 });
  enforceRateLimit(`resend:ip:${ip}`, { max: 12, windowMs: 10 * 60_000 });

  // Deleting an account is a signed-in action; only the account holder may ask
  // for another confirmation code, and only for their own address.
  if (purpose === 'delete-account') {
    const session = await requireRole();
    if (session.email !== email) {
      const err = new Error('You can only request a code for your own account');
      err.status = 403;
      throw err;
    }
  }

  const user = await User.findOne({ email });

  // Derived rather than hard-coded so a silent no-send is indistinguishable
  // from a real send in the response body.
  let delivered = mailConfigured();

  const shouldSend =
    user &&
    user.status !== 'suspended' &&
    (purpose === 'signup' ? !user.emailVerified : true);

  if (shouldSend) {
    ({ delivered } = await issueCode({ email, purpose }));
  }

  return ok({ ok: true, email, purpose, delivered });
});
