import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import RoommateProfile from '@/models/RoommateProfile';
import { writeAudit } from '@/app/api/admin/_lib/audit';

const OID = /^[a-f0-9]{24}$/i;

/**
 * The only thing an admin can change about a roommate profile: whether it is
 * offered to other students. `visible` is the same switch the student has, so
 * hiding is moderation and not deletion, and their six answers are neither
 * read nor written here.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid profile id', 400);

  const { action, note } = await readJson(req);
  if (action !== 'hide' && action !== 'show') return fail('Unknown profile action', 422);

  const visible = action === 'show';
  const profile = await RoommateProfile.findById(id).select(
    'displayName campus gender visible complete'
  );
  if (!profile) return fail('That profile no longer exists', 404);

  if (profile.visible === visible) {
    return ok({ alreadyDone: true, visible });
  }

  profile.visible = visible;
  await profile.save();

  await writeAudit(req, session, {
    action: `roommate.${action}`,
    targetType: 'RoommateProfile',
    targetId: profile._id,
    meta: {
      student: profile.displayName,
      campus: profile.campus,
      complete: profile.complete,
      note: note || '',
    },
  });

  return ok({ visible });
});
