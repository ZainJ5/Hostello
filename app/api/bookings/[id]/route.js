import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, fail, readJson } from '@/lib/api';
import { serialize } from '@/lib/utils';
import Booking from '@/models/Booking';
import { HOSTEL_FIELDS, redactContact } from '../_lib/shape';

const patchSchema = z.object({
  status: z.string().trim(),
});

function badId(id) {
  return !/^[a-f\d]{24}$/i.test(String(id || ''));
}

/**
 * GET /api/bookings/[id] — one of the caller's own requests.
 * A booking belonging to someone else returns 404 rather than 403, so the
 * endpoint can't be used to probe which booking ids exist.
 */
export const GET = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');
  const { id } = await ctx.params;
  if (badId(id)) return fail('Booking not found', 404);

  const booking = await Booking.findOne({ _id: id, studentId: session.userId })
    .populate('hostelId', HOSTEL_FIELDS)
    .lean();

  if (!booking) return fail('Booking not found', 404);

  return ok({ booking: serialize(redactContact(booking)) });
});

/**
 * PATCH /api/bookings/[id] — the student side of a booking's lifecycle, which
 * is exactly one transition: `pending -> cancelled`, on their own request.
 * Confirming, rejecting and completing belong to the owner portal; this route
 * refuses them outright rather than trusting the caller's role.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');
  const { id } = await ctx.params;
  if (badId(id)) return fail('Booking not found', 404);

  const body = patchSchema.parse(await readJson(req));

  if (body.status !== 'cancelled') {
    return fail('You can only cancel your own request', 403);
  }

  const booking = await Booking.findOne({ _id: id, studentId: session.userId });
  if (!booking) return fail('Booking not found', 404);

  if (booking.status !== 'pending') {
    return fail(
      booking.status === 'cancelled'
        ? 'This request is already cancelled'
        : `This request has been ${booking.status} and can no longer be cancelled`,
      409
    );
  }

  booking.status = 'cancelled';
  await booking.save();

  const populated = await Booking.findById(booking._id)
    .populate('hostelId', HOSTEL_FIELDS)
    .lean();

  return ok({ booking: serialize(redactContact(populated)) });
});
