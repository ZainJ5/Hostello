import { handler, ok, fail, readJson } from '@/lib/api';
import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { sendNotification } from '@/lib/mail';
import Booking from '@/models/Booking';
import Hostel from '@/models/Hostel';
import { serialize, formatDate } from '@/lib/utils';
import { bookingResponseSchema } from '@/components/owner/schemas';
import { assertOwned, objectIdOr404 } from '@/app/(owner)/_lib/owner-data';
import { auditOwner } from '@/app/(owner)/_lib/audit';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Confirm or decline a booking request.
 *
 * `Booking` has no `ownerId` of its own, so ownership is proved through the
 * hostel it points at: the booking is loaded first, then its hostel, and
 * `assertOwned` runs on the hostel before anything is written.
 */
export const PATCH = handler(async (req, ctx) => {
  await connectDB();
  const session = await requireRole('owner', 'admin');
  const { id } = await ctx.params;

  const booking = await Booking.findById(objectIdOr404(id, 'booking request'));
  if (!booking) return fail('That booking request no longer exists', 404);

  const hostel = await Hostel.findById(booking.hostelId).select('name slug ownerId contact');
  assertOwned(hostel, session, 'booking request');

  const { status, message } = bookingResponseSchema.parse(await readJson(req));

  if (booking.status !== 'pending') {
    return fail(`This request was already ${booking.status}.`, 409);
  }

  booking.status = status;
  booking.ownerResponse = message || '';
  booking.respondedAt = new Date();
  await booking.save();

  // The student is told either way. Mail is best-effort: a send that fails is
  // caught below, so a mail outage never costs the owner their confirmation.
  if (booking.studentEmail) {
    const confirmed = status === 'confirmed';
    try {
      await sendNotification({
        to: booking.studentEmail,
        subject: confirmed
          ? `Your booking at ${hostel.name} is confirmed`
          : `Update on your request for ${hostel.name}`,
        heading: confirmed ? 'Your room is confirmed' : 'Your request was declined',
        body: confirmed
          ? `${hostel.name} confirmed your request${
              booking.moveInDate ? ` for ${formatDate(booking.moveInDate)}` : ''
            }.${message ? ` They added: “${message}”` : ''} Contact them on ${
              hostel.contact?.phone || 'the number on the listing'
            } to arrange your move-in.`
          : `${hostel.name} could not take your request${
              message ? `. They said: “${message}”` : ' at this time'
            }. There are other hostels near your university on Hostello.`,
        cta: {
          href: `${SITE}/hostels/${hostel.slug}`,
          label: confirmed ? 'View your hostel' : 'Browse similar hostels',
        },
      });
    } catch (err) {
      console.error('[owner booking mail]', err?.message);
    }
  }

  await auditOwner(req, session, `owner.booking.${status}`, {
    targetType: 'Booking',
    targetId: booking._id,
    meta: { hostelId: String(hostel._id), hasMessage: Boolean(message) },
  });

  return ok({ booking: serialize(booking.toObject()) });
});
