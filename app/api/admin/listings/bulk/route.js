import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import Hostel from '@/models/Hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { getSettings } from '@/app/api/admin/_lib/settings';

const OID = /^[a-f0-9]{24}$/i;

const ACTIONS = {
  publish: { $set: { status: 'published', rejectionReason: '' } },
  suspend: { $set: { status: 'suspended' } },
  unpublish: { $set: { status: 'draft' } },
  verify: { $set: { verified: true } },
  unverify: { $set: { verified: false } },
  feature: { $set: { featured: true } },
  unfeature: { $set: { featured: false } },
  markAvailable: { $set: { available: true } },
  markUnavailable: { $set: { available: false } },
};

export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('admin');

  const { ids, action } = await readJson(req);
  const list = (Array.isArray(ids) ? ids : []).filter((id) => OID.test(String(id)));

  if (!list.length) return fail('Select at least one listing', 400);
  if (list.length > 200) return fail('Bulk actions are capped at 200 listings', 400);
  if (!ACTIONS[action]) return fail('Unknown bulk action', 422);

  // Featured slots are a paid, finite inventory, so never let a bulk action
  // quietly blow past the configured cap.
  if (action === 'feature') {
    const settings = await getSettings();
    const alreadyFeatured = await Hostel.countDocuments({
      featured: true,
      _id: { $nin: list },
    });
    const room = Math.max(0, (settings?.featuredSlots ?? 0) - alreadyFeatured);
    if (list.length > room) {
      return fail(
        room === 0
          ? `All ${settings?.featuredSlots ?? 0} featured slots are in use. Unfeature a listing first.`
          : `Only ${room} featured slot${room === 1 ? '' : 's'} left, but you selected ${list.length}.`,
        409
      );
    }
  }

  const update = { ...ACTIONS[action] };
  if (action === 'publish') update.$set.publishedAt = new Date();

  const res = await Hostel.updateMany({ _id: { $in: list } }, update);

  await writeAudit(req, session, {
    action: 'listing.bulk',
    targetType: 'Hostel',
    targetId: `${list.length} listings`,
    meta: { bulkAction: action, ids: list, matched: res.matchedCount, modified: res.modifiedCount },
  });

  return ok({ matched: res.matchedCount, modified: res.modifiedCount, action });
});
