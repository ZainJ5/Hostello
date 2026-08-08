import { handler, ok, fail, readJson, clientIp } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole, hashPassword, verifyPassword } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import User from '@/models/User';
import { passwordSchema } from '@/components/owner/schemas';
import { getOwnerContext, notFound } from '@/app/(owner)/_lib/owner-data';
import { auditOwner } from '@/app/(owner)/_lib/audit';

/**
 * Password change. Requires the current password, so a hijacked but unlocked
 * browser session cannot lock the real owner out of their account.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { ownerId } = await getOwnerContext();

  enforceRateLimit(`owner-password:${session.userId}:${clientIp(req)}`, {
    max: 5,
    windowMs: 15 * 60_000,
  });

  const data = passwordSchema.parse(await readJson(req));

  // `passwordHash` is `select: false` on the model.
  const user = await User.findById(ownerId).select('+passwordHash');
  if (!user) throw notFound('Your account no longer exists');

  const valid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!valid) return fail('That is not your current password', 422);

  user.passwordHash = await hashPassword(data.newPassword);
  await user.save();

  await auditOwner(req, session, 'owner.password.changed', {
    targetType: 'User',
    targetId: user._id,
  });

  return ok({ changed: true });
});
