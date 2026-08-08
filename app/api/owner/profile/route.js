import { handler, ok, readJson } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import User from '@/models/User';
import { serialize } from '@/lib/utils';
import { profileSchema } from '@/components/owner/schemas';
import { getOwnerContext, notFound } from '@/app/(owner)/_lib/owner-data';
import { auditOwner } from '@/app/(owner)/_lib/audit';

/**
 * Updates the owner's own profile. The document loaded is always the one the
 * session resolves to — there is no id in the URL, so there is nothing to
 * tamper with. Email and role are intentionally not editable here: changing an
 * email is an auth flow (it needs re-verification) and role is an admin action.
 */
export const PATCH = handler(async (req) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { ownerId } = await getOwnerContext();

  const data = profileSchema.parse(await readJson(req));

  const user = await User.findById(ownerId);
  if (!user) throw notFound('Your account no longer exists');

  user.name = data.name;
  user.businessName = data.businessName || '';
  user.phone = data.phone || '';
  user.city = data.city || '';
  user.cnic = data.cnic || '';
  await user.save();

  await auditOwner(req, session, 'owner.profile.updated', {
    targetType: 'User',
    targetId: user._id,
    meta: { fields: Object.keys(data) },
  });

  return ok({
    profile: serialize({
      name: user.name,
      email: user.email,
      businessName: user.businessName,
      phone: user.phone,
      city: user.city,
      cnic: user.cnic,
    }),
  });
});
