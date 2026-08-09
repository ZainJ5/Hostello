import { handler, ok, fail } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Payment from '@/models/Payment';
import { serialize } from '@/lib/utils';
import { submitListingSchema } from '@/components/owner/schemas';
import { nextStatusAfterSubmit } from '@/app/(owner)/_lib/listing-ops';
import { loadOwnedHostel } from '@/app/(owner)/_lib/owner-data';
import { auditOwner } from '@/app/(owner)/_lib/audit';

/**
 * `draft`/`rejected` → the next step in the lifecycle.
 *
 * The listing is re-validated here against the same strict schema the wizard's
 * review step ran, because the wizard only ever guarded the UI: the document on
 * disk is what actually gets published.
 */
export const POST = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;
  const hostel = await loadOwnedHostel(id, session);

  if (['pending_review', 'published'].includes(hostel.status)) {
    return fail(
      hostel.status === 'published'
        ? 'This listing is already live. Edits publish immediately, so no resubmission is needed.'
        : 'This listing is already with an admin for review.',
      409
    );
  }
  if (hostel.status === 'suspended') {
    return fail('Suspended listings can only be restored by an admin.', 409);
  }

  // Throws a 422 with `fieldErrors` the wizard maps back onto its steps.
  submitListingSchema.parse({
    name: hostel.name,
    city: hostel.city,
    area: hostel.area,
    address: hostel.address,
    universities: hostel.universities || [],
    gender: hostel.gender,
    price: hostel.price,
    priceMin: hostel.priceMin,
    priceMax: hostel.priceMax,
    securityDeposit: hostel.securityDeposit,
    rooms: (hostel.rooms || []).map((r) => ({
      type: r.type,
      price: r.price,
      capacity: r.capacity,
      available: r.available,
    })),
    description: hostel.description,
    facilities: hostel.facilities || [],
    rules: hostel.rules || [],
    images: hostel.images || [],
    lat: hostel.lat,
    lng: hostel.lng,
    contact: {
      name: hostel.contact?.name || '',
      phone: hostel.contact?.phone || '',
      whatsapp: hostel.contact?.whatsapp || '',
      email: hostel.contact?.email || '',
    },
  });

  const latestPayment = await Payment.findOne({ hostelId: hostel._id, ownerId: hostel.ownerId })
    .sort({ createdAt: -1 })
    .lean();

  const previousStatus = hostel.status;
  hostel.status = nextStatusAfterSubmit(hostel.status, latestPayment);
  // The old reason must not linger on a listing the owner has already fixed.
  hostel.rejectionReason = '';
  await hostel.save();

  await auditOwner(req, session, 'owner.listing.submitted', {
    targetType: 'Hostel',
    targetId: hostel._id,
    meta: { from: previousStatus, to: hostel.status },
  });

  return ok({
    listing: serialize(hostel.toObject()),
    status: hostel.status,
    // Where the UI should send them next.
    next:
      hostel.status === 'pending_payment'
        ? `/owner/listings/${hostel._id}/payment`
        : '/owner/listings',
  });
});
