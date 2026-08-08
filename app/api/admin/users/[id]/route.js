import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import User, { ROLES } from '@/models/User';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import Booking from '@/models/Booking';
import Payment from '@/models/Payment';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { recomputeHostelRating } from '@/app/api/admin/_lib/reviews';
import { serialize } from '@/lib/utils';

const OID = /^[a-f0-9]{24}$/i;

/** Never let the console lock every admin out of itself. */
async function guardLastAdmin(user, session) {
  if (user.role !== 'admin') return null;
  const admins = await User.countDocuments({ role: 'admin', status: 'active' });
  if (admins <= 1) return fail('This is the only active admin — promote someone else first', 409);
  if (String(user._id) === String(session.userId)) {
    return fail('You cannot change your own admin access from here', 409);
  }
  return null;
}

export const GET = handler(async (req, ctx) => {
  await connectDB();
  await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid user id', 400);

  // `passwordHash` is select:false, so it is never in this document.
  const user = await User.findById(id).lean();
  if (!user) return fail('That account no longer exists', 404);

  return ok({ user: serialize(user) });
});

export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid user id', 400);

  const { role, status } = await readJson(req);
  const user = await User.findById(id);
  if (!user) return fail('That account no longer exists', 404);

  if (role !== undefined) {
    if (!ROLES.includes(role)) return fail('Unknown role', 422);
    if (role !== user.role) {
      const blocked = await guardLastAdmin(user, session);
      if (blocked) return blocked;
    }
  }

  if (status !== undefined) {
    if (!['active', 'suspended'].includes(status)) return fail('Unknown status', 422);
    if (status === 'suspended') {
      const blocked = await guardLastAdmin(user, session);
      if (blocked) return blocked;
    }
  }

  const before = { role: user.role, status: user.status };
  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;

  if (before.role === user.role && before.status === user.status) {
    return ok({ alreadyDone: true, user: serialize(user.toObject()) });
  }

  await user.save();

  await writeAudit(req, session, {
    action: role !== undefined && before.role !== user.role ? 'user.role' : 'user.status',
    targetType: 'User',
    targetId: user._id,
    meta: { email: user.email, before, after: { role: user.role, status: user.status } },
  });

  return ok({ user: serialize(user.toObject()) });
});

/**
 * Hard delete. Their reviews and bookings go with them; any listing they own
 * is orphaned and suspended rather than deleted, so the marketplace does not
 * silently lose inventory a new owner could take over.
 */
export const DELETE = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid user id', 400);

  if (String(id) === String(session.userId)) {
    return fail('You cannot delete your own account from the admin console', 409);
  }

  const user = await User.findById(id).lean();
  if (!user) return ok({ deleted: false, alreadyGone: true });

  const blocked = await guardLastAdmin(user, session);
  if (blocked) return blocked;

  const affectedHostels = await Review.distinct('hostelId', { studentId: user._id });

  const [reviews, bookings, payments, listings] = await Promise.all([
    Review.deleteMany({ studentId: user._id }),
    Booking.deleteMany({ studentId: user._id }),
    Payment.deleteMany({ ownerId: user._id }),
    Hostel.updateMany({ ownerId: user._id }, { $set: { ownerId: null, status: 'suspended' } }),
  ]);

  for (const hostelId of affectedHostels) {
    await recomputeHostelRating(hostelId);
  }

  await User.deleteOne({ _id: user._id });

  await writeAudit(req, session, {
    action: 'user.delete',
    targetType: 'User',
    targetId: user._id,
    meta: {
      email: user.email,
      role: user.role,
      cascaded: {
        reviews: reviews.deletedCount,
        bookings: bookings.deletedCount,
        payments: payments.deletedCount,
        listingsOrphaned: listings.modifiedCount,
      },
    },
  });

  return ok({ deleted: true });
});
