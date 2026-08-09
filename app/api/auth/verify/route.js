import { connectDB } from '@/lib/db';
import { handler, ok, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createSession } from '@/lib/auth';
import { verifySchema } from '@/lib/validators/auth';
import User from '@/models/User';
import { verifyCode } from '../_lib/codes';
import { publicUser, homeForRole, SUSPENDED_MESSAGE } from '../_lib/users';

/**
 * POST /api/auth/verify: { email, code, purpose }
 *
 * `signup` is the only purpose that mutates state here: it flips
 * `emailVerified` and opens a session. `reset` and `delete-account` are
 * checked *without* consuming the code, because the follow-up request
 * (reset-password / DELETE delete-account) is what actually performs the
 * change and must be the call that spends it. Wrong guesses count against the
 * 5-attempt cap on every purpose.
 */
export const POST = handler(async (req) => {
  await connectDB();

  const ip = clientIp(req);
  enforceRateLimit(`verify:ip:${ip}`, { max: 30, windowMs: 10 * 60_000 });

  const { email, code, purpose } = verifySchema.parse(await readJson(req));
  enforceRateLimit(`verify:${purpose}:${email}`, { max: 15, windowMs: 10 * 60_000 });

  if (purpose !== 'signup') {
    await verifyCode({ email, purpose, code, consume: false });
    return ok({ ok: true, verified: true, email, purpose });
  }

  await verifyCode({ email, purpose, code, consume: true });

  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('That account no longer exists. Sign up again.');
    err.status = 404;
    throw err;
  }
  if (user.status === 'suspended') {
    const err = new Error(SUSPENDED_MESSAGE);
    err.status = 403;
    throw err;
  }

  user.emailVerified = true;
  user.lastLoginAt = new Date();
  await user.save();

  await createSession({
    userId: user._id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return ok({
    ok: true,
    verified: true,
    user: publicUser(user),
    redirect: homeForRole(user.role),
  });
});
