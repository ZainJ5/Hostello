import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok, created, fail, readJson } from '@/lib/api';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sendNotification } from '@/lib/mail';
import { normalizePhone, serialize, formatDate } from '@/lib/utils';
import Booking, { BOOKING_STATUSES } from '@/models/Booking';
import Hostel, { ROOM_TYPES } from '@/models/Hostel';
import User from '@/models/User';
import { HOSTEL_FIELDS, redactContact } from './_lib/shape';
import {
  ACTIVE_BOOKING_STATUSES,
  MAX_DURATION_MONTHS,
  formatDuration,
  isoDateToUTC,
  todayInPK,
} from '@/components/student/constants';

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'That listing could not be found');

const createSchema = z.object({
  hostelId: objectId,
  roomType: z.string().trim().max(40).default(''),
  moveInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the date you want to move in'),
  durationMonths: z.coerce
    .number()
    .int('Choose how long you plan to stay')
    .min(1, 'Stay must be at least one month')
    .max(MAX_DURATION_MONTHS, `We cap requests at ${MAX_DURATION_MONTHS} months`),
  phone: z
    .string()
    .trim()
    .min(10, 'Enter a number the hostel can reach you on')
    .max(20, 'That number looks too long'),
  message: z
    .string()
    .trim()
    .max(1000, 'Keep your message under 1000 characters')
    .default(''),
});

/**
 * GET /api/bookings: the caller's own requests, newest first.
 * Always scoped by `studentId: session.userId`; there is no parameter that can
 * widen it to another student's rows.
 */
export const GET = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 200);

  const query = { studentId: session.userId };
  if (status && BOOKING_STATUSES.includes(status)) query.status = status;

  const rows = await Booking.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('hostelId', HOSTEL_FIELDS)
    .lean();

  return ok({ bookings: serialize(rows.map(redactContact)) });
});

/** POST /api/bookings: create a request against a published listing. */
export const POST = handler(async (req) => {
  await connectDB();
  const session = await requireRole('student', 'owner', 'admin');

  // A request emails a real hostel owner, so it is worth a ceiling.
  enforceRateLimit(`booking:create:${session.userId}`, {
    max: 12,
    windowMs: 60 * 60 * 1000,
  });

  const body = createSchema.parse(await readJson(req));

  if (body.moveInDate < todayInPK()) {
    return fail('Please check the highlighted fields', 422, {
      fieldErrors: { moveInDate: ['Move-in date cannot be in the past'] },
    });
  }

  const hostel = await Hostel.findById(body.hostelId)
    .select('name slug status ownerId contact rooms city area')
    .lean();

  if (!hostel || hostel.status !== 'published') {
    return fail('This hostel is not accepting requests right now', 404);
  }

  // Only accept a room type the listing actually advertises. Listings with no
  // `rooms` array fall back to the standard vocabulary from the model.
  const allowedRooms = hostel.rooms?.length ? hostel.rooms.map((r) => r.type) : ROOM_TYPES;
  if (body.roomType && !allowedRooms.includes(body.roomType)) {
    return fail('Please check the highlighted fields', 422, {
      fieldErrors: { roomType: ['That room type is not offered by this hostel'] },
    });
  }

  // One live request per student per hostel. A second one just spams the
  // owner with a decision they have already been asked to make.
  const active = await Booking.findOne({
    hostelId: hostel._id,
    studentId: session.userId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  })
    .select('_id status')
    .lean();

  if (active) {
    return fail(
      active.status === 'confirmed'
        ? 'This hostel has already confirmed your request'
        : 'You already have a request pending with this hostel',
      409,
      { bookingId: String(active._id), bookingStatus: active.status }
    );
  }

  const user = await User.findById(session.userId).select('name email phone').lean();
  if (!user) return fail('Sign in to continue', 401);

  const phone = normalizePhone(body.phone) || body.phone;

  // The model denormalises the student's details onto the booking so the owner
  // still knows who enquired even if the account is deleted later.
  const booking = await Booking.create({
    hostelId: hostel._id,
    studentId: session.userId,
    studentName: user.name,
    studentEmail: user.email,
    studentPhone: phone,
    roomType: body.roomType,
    moveInDate: isoDateToUTC(body.moveInDate),
    durationMonths: body.durationMonths,
    message: body.message,
    status: 'pending',
  });

  // A student's first request doubles as the moment we learn their number.
  if (!user.phone && phone) {
    await User.updateOne({ _id: session.userId }, { $set: { phone } });
  }

  await notifyOwner({ hostel, booking, user, phone });

  return created({
    booking: serialize(booking.toObject()),
    hostel: { name: hostel.name, slug: hostel.slug },
  });
});

/**
 * Email the owner. Never allowed to fail the request: the booking is already
 * durable and visible in the owner portal, so a bounced SMTP connection must
 * not cost the student their submission.
 */
async function notifyOwner({ hostel, booking, user, phone }) {
  try {
    let to = hostel.contact?.email;
    if (!to && hostel.ownerId) {
      const owner = await User.findById(hostel.ownerId).select('email').lean();
      to = owner?.email;
    }
    if (!to) return;

    const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const lines = [
      `${user.name} wants to move in on ${formatDate(booking.moveInDate)} for ${formatDuration(booking.durationMonths)}.`,
      booking.roomType ? `Room type: ${booking.roomType}.` : '',
      `Reach them on ${phone} or ${user.email}.`,
      booking.message ? `They wrote: "${booking.message}"` : '',
      'Sign in to your Hostello owner dashboard to confirm or decline this request.',
    ].filter(Boolean);

    await sendNotification({
      to,
      subject: `New booking request for ${hostel.name}`,
      heading: `${user.name} enquired about ${hostel.name}`,
      body: lines.join(' '),
      cta: { href: `${site}/hostels/${hostel.slug}`, label: 'View your listing' },
    });
  } catch (err) {
    console.error('[bookings] owner notification failed', err);
  }
}
