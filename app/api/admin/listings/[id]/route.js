import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import Hostel, { HOSTEL_STATUSES } from '@/models/Hostel';
import Booking from '@/models/Booking';
import Review from '@/models/Review';
import Payment from '@/models/Payment';
import PageView from '@/models/PageView';
import { hostelInput, normalizeHostel, uniqueSlug } from '@/app/api/admin/_lib/hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { serialize } from '@/lib/utils';

const OID = /^[a-f0-9]{24}$/i;

export const GET = handler(async (req, ctx) => {
  await connectDB();
  await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid listing id', 400);

  const doc = await Hostel.findById(id).populate('ownerId', 'name email').lean();
  if (!doc) return fail('That listing no longer exists', 404);

  return ok({ hostel: serialize(doc) });
});

/**
 * Two shapes share this handler: a full form save, and a targeted state
 * change (`{ status }` / `{ verified }` / `{ featured }` / `{ available }`)
 * from a row action. A targeted change never has to send the whole document.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid listing id', 400);

  const existing = await Hostel.findById(id);
  if (!existing) return fail('That listing no longer exists', 404);

  const body = await readJson(req);

  // ── Targeted state change ──
  if (body.patch === 'state') {
    const update = {};
    if (body.status !== undefined) {
      if (!HOSTEL_STATUSES.includes(body.status)) return fail('Unknown status', 422);
      update.status = body.status;
      update.rejectionReason = body.status === 'rejected' ? String(body.reason || '') : '';
      if (body.status === 'published' && !existing.publishedAt) update.publishedAt = new Date();
    }
    for (const flag of ['verified', 'featured', 'available']) {
      if (body[flag] !== undefined) update[flag] = Boolean(body[flag]);
    }
    if (!Object.keys(update).length) return fail('Nothing to change', 400);

    const before = {
      status: existing.status,
      verified: existing.verified,
      featured: existing.featured,
      available: existing.available,
    };
    Object.assign(existing, update);
    await existing.save();

    await writeAudit(req, session, {
      action: update.status ? 'listing.status' : 'listing.update',
      targetType: 'Hostel',
      targetId: existing._id,
      meta: { name: existing.name, before, after: update },
    });

    return ok({ hostel: serialize(existing.toObject()) });
  }

  // ── Full form save ──
  const data = hostelInput.parse(body);
  const slug =
    data.slug && data.slug === existing.slug
      ? existing.slug
      : await uniqueSlug(data.slug || data.name, existing._id);

  const payload = normalizeHostel({ ...data, slug });
  if (payload.status === 'published' && !existing.publishedAt) payload.publishedAt = new Date();
  if (payload.status !== 'rejected') payload.rejectionReason = data.rejectionReason || '';

  const beforeStatus = existing.status;
  Object.assign(existing, payload);
  await existing.save();

  await writeAudit(req, session, {
    action: 'listing.update',
    targetType: 'Hostel',
    targetId: existing._id,
    meta: {
      name: existing.name,
      ...(beforeStatus !== existing.status
        ? { before: { status: beforeStatus }, after: { status: existing.status } }
        : {}),
    },
  });

  return ok({ hostel: serialize(existing.toObject()) });
});

/**
 * Hard delete. The listing's dependent rows go with it — leaving orphaned
 * bookings and reviews pointing at a missing hostel would break every screen
 * that joins them.
 */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid listing id', 400);

  const doc = await Hostel.findById(id).lean();
  if (!doc) return ok({ deleted: false, alreadyGone: true });

  const [bookings, reviews, payments, views] = await Promise.all([
    Booking.deleteMany({ hostelId: doc._id }),
    Review.deleteMany({ hostelId: doc._id }),
    Payment.deleteMany({ hostelId: doc._id }),
    PageView.deleteMany({ hostelId: doc._id }),
  ]);
  await Hostel.deleteOne({ _id: doc._id });

  await writeAudit(req, session, {
    action: 'listing.delete',
    targetType: 'Hostel',
    targetId: doc._id,
    meta: {
      name: doc.name,
      city: doc.city,
      status: doc.status,
      cascaded: {
        bookings: bookings.deletedCount,
        reviews: reviews.deletedCount,
        payments: payments.deletedCount,
        pageViews: views.deletedCount,
      },
    },
  });

  return ok({ deleted: true });
});
