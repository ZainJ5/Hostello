import { connectDB } from '@/lib/db';
import { handler, ok, readJson, clientIp } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { requireRole, destroySession } from '@/lib/auth';
import { deleteAccountSchema } from '@/lib/validators/auth';
import User from '@/models/User';
import Hostel from '@/models/Hostel';
import Review from '@/models/Review';
import Booking from '@/models/Booking';
import VerificationCode from '@/models/VerificationCode';
import AuditLog from '@/models/AuditLog';
import { issueCode, verifyCode } from '../_lib/codes';

/**
 * POST /api/auth/delete-account
 *
 * Step one: emails a `delete-account` code to the signed-in user's own
 * address. Deletion is irreversible, so it is gated on the same proof of
 * mailbox control as signup: a hijacked open tab shouldn't be enough.
 */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole();

  enforceRateLimit(`delete-code:${session.userId}`, { max: 3, windowMs: 10 * 60_000 });
  enforceRateLimit(`delete-code:ip:${clientIp(req)}`, { max: 10, windowMs: 10 * 60_000 });

  const user = await User.findById(session.userId);
  if (!user) {
    const err = new Error('Sign in to continue');
    err.status = 401;
    throw err;
  }

  // Flags the intent so the account page can show "deletion pending" and the
  // admin panel can see a request in flight.
  user.pendingDeletionAt = new Date();
  await user.save();

  const { delivered } = await issueCode({ email: user.email, purpose: 'delete-account' });

  return ok({ ok: true, email: user.email, purpose: 'delete-account', delivered });
});

/**
 * DELETE /api/auth/delete-account: { code }
 *
 * Step two: verifies the code, then removes the account and everything that
 * points at it. There is no soft-delete and no undo.
 */
export const DELETE = handler(async (req) => {
  await connectDB();
  const session = await requireRole();

  enforceRateLimit(`delete:${session.userId}`, { max: 10, windowMs: 15 * 60_000 });

  const { code } = deleteAccountSchema.parse(await readJson(req));

  const user = await User.findById(session.userId);
  if (!user) {
    const err = new Error('Sign in to continue');
    err.status = 401;
    throw err;
  }

  await verifyCode({ email: user.email, purpose: 'delete-account', code, consume: true });

  const userId = user._id;

  // ── Reviews ──────────────────────────────────────────────────────────
  // Hostel.rating / reviewCount are denormalised, so the listings this user
  // reviewed have to be recomputed, otherwise a deleted review keeps voting.
  const reviews = await Review.find({ studentId: userId }).select('hostelId').lean();
  const reviewedHostelIds = [
    ...new Map(reviews.map((r) => [String(r.hostelId), r.hostelId])).values(),
  ];
  await Review.deleteMany({ studentId: userId });

  if (reviewedHostelIds.length) {
    const totals = await Review.aggregate([
      { $match: { hostelId: { $in: reviewedHostelIds }, status: 'published' } },
      { $group: { _id: '$hostelId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const byHostel = new Map(totals.map((t) => [String(t._id), t]));

    await Hostel.bulkWrite(
      reviewedHostelIds.map((id) => {
        const t = byHostel.get(String(id));
        return {
          updateOne: {
            filter: { _id: id },
            update: {
              $set: {
                rating: t ? Math.round(t.avg * 10) / 10 : 0,
                reviewCount: t ? t.count : 0,
              },
            },
          },
        };
      })
    );
  }

  // ── Bookings ─────────────────────────────────────────────────────────
  // Bookings are removed outright. The Booking model denormalises
  // studentName/Email/Phone precisely so an owner keeps a record of who
  // enquired after a student leaves. If that history ever needs to survive,
  // switch this to a `studentId: null` update rather than a delete.
  await Booking.deleteMany({ studentId: userId });

  // ── Saved listings ───────────────────────────────────────────────────
  // saveCount is denormalised too, so drop this user's saves from the tally.
  if (user.savedHostels?.length) {
    await Hostel.updateMany(
      { _id: { $in: user.savedHostels }, saveCount: { $gt: 0 } },
      { $inc: { saveCount: -1 } }
    );
  }

  // ── Owned listings ───────────────────────────────────────────────────
  // Suspended rather than deleted, and unlinked from the departing owner.
  //
  // Deleting them would take live listings (with their reviews, bookings and
  // paid listing fees) down with the account, and students holding a
  // confirmed booking would lose the page they booked through. Leaving them
  // published is worse: a listing with no owner has nobody to answer the
  // phone. `suspended` is the one status that means "was live, is not now,
  // can be restored", so admin can hand a listing to a new owner instead of
  // rebuilding it. `ownerId: null` makes the orphan explicit and keeps the
  // record out of any surviving owner's dashboard.
  let hostelsSuspended = 0;
  if (user.role === 'owner' || user.role === 'admin') {
    const res = await Hostel.updateMany(
      { ownerId: userId },
      { $set: { ownerId: null, status: 'suspended', available: false } }
    );
    hostelsSuspended = res.modifiedCount ?? 0;
  }

  // Outstanding codes for this address are useless now, and leaving them would
  // let a re-registration of the same email be verified with an old code.
  await VerificationCode.deleteMany({ email: user.email });

  await AuditLog.create({
    actorId: userId,
    actorEmail: user.email,
    action: 'account.deleted',
    targetType: 'User',
    targetId: String(userId),
    meta: { role: user.role, reviewsRemoved: reviews.length, hostelsSuspended },
    ip: clientIp(req),
  });

  await User.deleteOne({ _id: userId });
  await destroySession();

  return ok({ ok: true, deleted: true });
});
