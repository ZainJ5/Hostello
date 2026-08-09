import { connectDB } from '@/lib/db';
import { handler, ok, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { hashPassword, destroySession } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validators/auth';
import User from '@/models/User';
import { verifyCode } from '../_lib/codes';
import { SUSPENDED_MESSAGE } from '../_lib/users';

/**
 * POST /api/auth/reset-password: { email, code, password }
 *
 * Consumes the `reset` code, then sets the new password. The user is left
 * signed out and sent to /login: a password change should end with proving the
 * new password works, and any session opened on a stolen device stays closed.
 */
export const POST = handler(async (req) => {
  await connectDB();

  const ip = clientIp(req);
  enforceRateLimit(`reset:ip:${ip}`, { max: 20, windowMs: 15 * 60_000 });

  const { email, code, password } = resetPasswordSchema.parse(await readJson(req));
  enforceRateLimit(`reset:email:${email}`, { max: 10, windowMs: 15 * 60_000 });

  await verifyCode({ email, purpose: 'reset', code, consume: true });

  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('That code is no longer valid. Start again.');
    err.status = 400;
    throw err;
  }
  if (user.status === 'suspended') {
    const err = new Error(SUSPENDED_MESSAGE);
    err.status = 403;
    throw err;
  }

  user.passwordHash = await hashPassword(password);
  // Reading the code proves control of the mailbox, which is exactly what
  // signup verification asks for, so an account stuck unverified is released.
  user.emailVerified = true;
  await user.save();

  // Anyone holding a session for this account is now on an old password.
  await destroySession();

  return ok({ ok: true, redirect: '/login' });
});
