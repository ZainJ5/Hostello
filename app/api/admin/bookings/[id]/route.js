import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { sendNotification } from '@/lib/mail';
import Booking, { BOOKING_STATUSES } from '@/models/Booking';
import Hostel from '@/models/Hostel';
import { writeAudit } from '@/app/api/admin/_lib/audit';
import { serialize } from '@/lib/utils';

const OID = /^[a-f0-9]{24}$/i;

export const GET = handler(async (req, ctx) => {
  await connectDB();
  await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid booking id', 400);

  const doc = await Booking.findById(id)
    .populate('hostelId', 'name slug city area contact')
    .populate('studentId', 'name email phone university')
    .lean();
  if (!doc) return fail('That booking no longer exists', 404);

  return ok({ booking: serialize(doc) });
});

/** Admin override of a booking's state, with the reason recorded either way. */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('admin');

  const { id } = await ctx.params;
  if (!OID.test(id)) return fail('Not a valid booking id', 400);

  const { status, response } = await readJson(req);
  if (!BOOKING_STATUSES.includes(status)) return fail('Unknown booking status', 422);

  const booking = await Booking.findById(id);
  if (!booking) return fail('That booking no longer exists', 404);

  if (booking.status === status) {
    return ok({ alreadyDone: true, booking: serialize(booking.toObject()) });
  }

  const before = booking.status;
  booking.status = status;
  booking.ownerResponse = String(response || booking.ownerResponse || '');
  booking.respondedAt = new Date();
  await booking.save();

  const hostel = await Hostel.findById(booking.hostelId).select('name slug').lean();

  await writeAudit(req, session, {
    action: 'booking.status',
    targetType: 'Booking',
    targetId: booking._id,
    meta: {
      before,
      after: status,
      student: booking.studentEmail || booking.studentName,
      hostel: hostel?.name || String(booking.hostelId),
      response: booking.ownerResponse || '',
    },
  });

  if (booking.studentEmail && ['confirmed', 'rejected', 'cancelled'].includes(status)) {
    await sendNotification({
      to: booking.studentEmail,
      subject: `Your Hostello request was ${status}`,
      heading: `Booking ${status}`,
      body: `Your request for “${hostel?.name || 'the hostel'}” is now marked ${status}.${
        booking.ownerResponse ? ` Note: ${booking.ownerResponse}` : ''
      }`,
      cta: { label: 'View your requests', href: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/bookings` },
    }).catch((err) => console.error('[bookings] status email failed', err));
  }

  return ok({ booking: serialize(booking.toObject()) });
});
