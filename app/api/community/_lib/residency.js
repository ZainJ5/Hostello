import Booking from '@/models/Booking';
import { REVIEWABLE_BOOKING_STATUSES } from '@/components/student/constants';

/**
 * Who counts as living somewhere.
 *
 * Answering a question and reading a notice board both turn on the same fact:
 * does this student actually live at this hostel. The product already has a
 * rule for that and it is argued out in `app/api/reviews/_lib/eligibility.js`:
 * a booking whose status is `confirmed` or `completed`. `pending` does not
 * qualify, because anybody can fire off an enquiry in ten seconds, and if that
 * let you onto a private board it would be no gate at all.
 *
 * Reusing the review rule rather than inventing a second one matters. Two
 * definitions of residency would drift, and the weaker one would become the
 * real one.
 *
 * Day one consequence, stated plainly: the `Booking` collection is empty after
 * a production seed, so on day one nobody can answer a question and no notice
 * board has a reader. That is an ordinary empty state and not a dead feature,
 * because the enquiry flow that creates bookings and the owner console that
 * confirms them are both live. It is the same shape as an empty reviews list.
 */
export async function livesAt(studentId, hostelId) {
  if (!studentId || !hostelId) return false;
  const booking = await Booking.exists({
    studentId,
    hostelId,
    status: { $in: REVIEWABLE_BOOKING_STATUSES },
  });
  return Boolean(booking);
}

/** Every hostel this student is a resident of, for picking a notice board. */
export async function residentHostelIds(studentId) {
  if (!studentId) return [];
  return Booking.distinct('hostelId', {
    studentId,
    status: { $in: REVIEWABLE_BOOKING_STATUSES },
  });
}
