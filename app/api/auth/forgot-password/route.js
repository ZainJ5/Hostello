import { connectDB } from '@/lib/db';
import { handler, ok, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit, rateLimit } from '@/lib/rate-limit';
import { forgotPasswordSchema } from '@/lib/validators/auth';
import User from '@/models/User';
import { issueCode, mailConfigured } from '../_lib/codes';

/**
 * POST /api/auth/forgot-password: { email }
 *
 * Always answers 200 with the same body, whether or not the address is
 * registered. A "no account found" error here would turn this endpoint into a
 * free membership oracle for anyone with a list of emails.
 *
 * The per-address send budget is checked with the non-throwing `rateLimit`, so
 * a flood is silently dropped rather than answered with a 429. A 429 would
 * leak the same information the generic response is hiding.
 */
export const POST = handler(async (req) => {
  await connectDB();

  const ip = clientIp(req);
  enforceRateLimit(`forgot:ip:${ip}`, { max: 15, windowMs: 15 * 60_000 });

  const { email } = forgotPasswordSchema.parse(await readJson(req));

  const { allowed } = rateLimit(`resend:email:${email}:reset`, {
    max: 3,
    windowMs: 10 * 60_000,
  });

  const user = allowed ? await User.findOne({ email }) : null;

  let delivered = mailConfigured();
  if (user && user.status !== 'suspended') {
    ({ delivered } = await issueCode({ email, purpose: 'reset' }));
  }

  return ok({ ok: true, email, purpose: 'reset', delivered });
});
