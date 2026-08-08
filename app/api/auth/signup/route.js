import { connectDB } from '@/lib/db';
import { handler, created, ok, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { hashPassword } from '@/lib/auth';
import { signupSchema } from '@/lib/validators/auth';
import User from '@/models/User';
import { issueCode } from '../_lib/codes';

/**
 * POST /api/auth/signup
 *
 * Creates an unverified account and emails a 6-digit code. The account cannot
 * sign in until /api/auth/verify confirms the address.
 *
 * An email that already exists and is verified is a 409. An email that exists
 * but was never verified is *not* an error: someone who abandoned signup half
 * way must be able to start again, and 409-ing them would also confirm to a
 * stranger that the address is registered.
 */
export const POST = handler(async (req) => {
  await connectDB();

  const ip = clientIp(req);
  enforceRateLimit(`signup:ip:${ip}`, { max: 10, windowMs: 60 * 60_000 });

  const { name, email, password, role } = signupSchema.parse(await readJson(req));

  // Per-address cap, so one mailbox cannot be flooded from many IPs.
  enforceRateLimit(`signup:email:${email}`, { max: 5, windowMs: 60 * 60_000 });

  const existing = await User.findOne({ email });

  if (existing?.emailVerified) {
    const err = new Error('An account with this email already exists. Sign in instead.');
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);

  if (existing) {
    // Unverified: adopt the details just submitted rather than keeping the
    // stale ones from the abandoned attempt.
    existing.name = name;
    existing.passwordHash = passwordHash;
    existing.role = role;
    existing.pendingDeletionAt = null;
    await existing.save();

    const { delivered } = await issueCode({ email, purpose: 'signup' });
    return ok({ ok: true, email, role, purpose: 'signup', delivered, resent: true });
  }

  // A concurrent duplicate trips the unique index; `handler` maps 11000 to 409.
  await User.create({
    name,
    email,
    passwordHash,
    role,
    emailVerified: false,
  });

  const { delivered } = await issueCode({ email, purpose: 'signup' });
  return created({ ok: true, email, role, purpose: 'signup', delivered, resent: false });
});
