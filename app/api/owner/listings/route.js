import { handler, created, ok, readJson } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Hostel from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import { draftListingSchema } from '@/components/owner/schemas';
import { applyListingPatch, uniqueSlug } from '@/app/(owner)/_lib/listing-ops';
import { getOwnerContext } from '@/app/(owner)/_lib/owner-data';
import { auditOwner } from '@/app/(owner)/_lib/audit';

/** The owner's own listings. Scoped by `ownerId`, never by anything else. */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const { ownerId, session } = await getOwnerContext(url.searchParams.get('ownerId'));

  const query = { ownerId };
  const status = url.searchParams.get('status');
  if (status && status !== 'all') query.status = status;

  const listings = await Hostel.find(query)
    .select('name slug status city area price images rating reviewCount views updatedAt')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  return ok({ listings: serialize(listings), role: session.role });
});

/**
 * Creates a draft. The wizard calls this once, as soon as step 1 validates, so
 * everything typed afterwards has somewhere to autosave to.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const body = await readJson(req);
  const patch = draftListingSchema.parse(body);

  // Admins may seed a draft on an owner's behalf; owners always get their own
  // id, with no way to spoof it from the body.
  const { ownerId } = await getOwnerContext(session.role === 'admin' ? body.ownerId : null);

  const name = patch.name || 'Untitled listing';
  const hostel = new Hostel({
    ownerId,
    name,
    slug: await uniqueSlug(name),
    city: patch.city || '',
    price: patch.price ?? 0,
    status: 'draft',
  });

  applyListingPatch(hostel, patch);
  // `city` and `price` are required by the schema; a brand-new draft may not
  // have reached the pricing step yet, so keep the placeholders valid.
  if (!hostel.city) hostel.city = 'Islamabad';
  if (hostel.price == null) hostel.price = 0;

  await hostel.save();
  await auditOwner(req, session, 'owner.listing.created', {
    targetType: 'Hostel',
    targetId: hostel._id,
    meta: { name: hostel.name },
  });

  return created({ listing: serialize(hostel.toObject()) });
});
