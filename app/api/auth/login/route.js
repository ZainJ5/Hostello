import { connectDB } from '@/lib/db';
import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit, rateLimit } from '@/lib/rate-limit';
import { verifyPassword, createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validators/auth';
import User from '@/models/User';
import { issueCode, mailConfigured } from '../_lib/codes';
import { publicUser, homeForRole, SUSPENDED_MESSAGE } from '../_lib/users';

/**
 * A real bcrypt hash of a string nobody knows. Compared against when the email
 * doesn't exist so an unknown address costs the same ~200ms as a known one —
 * without it, response time alone enumerates registered users.
 */
const TIMING_EQUALISER_HASH =
  '$2b$12$v3iP/3lOB8oKO3sXPvZw9uWHwePMqdPPG.mrErcriARKH2FcFLc0m';

/** Deliberately identical for "no such user" and "wrong password". */
const BAD_CREDENTIALS = 'Email or password is incorrect';

/**
 * POST /api/auth/login — { email, password }
 *
 * Unverified accounts get a 403 carrying `code: 'EMAIL_NOT_VERIFIED'` plus a
 * fresh code, so the client can route straight to /verify instead of showing a
 * dead end.
 */
export const POST = handler(async (req) => {
  await connectDB();

  const ip = clientIp(req);
  enforceRateLimit(`login:ip:${ip}`, { max: 20, windowMs: 10 * 60_000 });

  const { email, password } = loginSchema.parse(await readJson(req));
  enforceRateLimit(`login:email:${email}`, { max: 8, windowMs: 10 * 60_000 });

  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordOk = await verifyPassword(
    password,
    user?.passwordHash || TIMING_EQUALISER_HASH
  );

  if (!user || !passwordOk) {
    const err = new Error(BAD_CREDENTIALS);
    err.status = 401;
    throw err;
  }

  if (user.status === 'suspended') {
    const err = new Error(SUSPENDED_MESSAGE);
    err.status = 403;
    throw err;
  }

  if (!user.emailVerified) {
    // Send a fresh code so the verify screen is usable immediately, but share
    // the resend budget so a valid password can't be used to spam the mailbox.
    let delivered = mailConfigured();
    const { allowed } = rateLimit(`resend:email:${email}:signup`, {
      max: 3,
      windowMs: 10 * 60_000,
    });
    if (allowed) ({ delivered } = await issueCode({ email, purpose: 'signup' }));

    return fail('Verify your email address to continue', 403, {
      code: 'EMAIL_NOT_VERIFIED',
      email,
      purpose: 'signup',
      delivered,
      sent: allowed,
    });
  }

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
    user: publicUser(user),
    redirect: homeForRole(user.role),
  });
});
