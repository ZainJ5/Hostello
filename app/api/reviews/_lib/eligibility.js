import Booking from '@/models/Booking';
import Review from '@/models/Review';
import { REVIEWABLE_BOOKING_STATUSES } from '@/components/student/constants';

/**
 * Review eligibility rule, enforced in `POST /api/reviews` and mirrored by the
 * "Hostels you can review" shelf on `/dashboard/reviews`.
 *
 * A student may review a hostel only if they hold a booking on it whose status
 * is `confirmed` or `completed`.
 *
 *   confirmed  the owner accepted them, so they have first-hand experience of
 *              the place, the owner and the room they were shown
 *   completed  they stayed and moved on, the most valuable review of all
 *
 * `pending` deliberately does NOT qualify: anyone can fire off a request in
 * ten seconds, and if that unlocked reviewing, a single competitor could bury
 * a listing under one-star reviews without ever setting foot in it.
 * `rejected` and `cancelled` do not qualify either: a student who was turned
 * away has an axe to grind but no stay to describe, and the owner has no way
 * to answer for a tenancy that never happened.
 *
 * The rule is checked server-side on every write; the UI only ever hides the
 * button, it is never the thing enforcing it.
 */
export async function canReviewHostel(studentId, hostelId) {
  const booking = await Booking.exists({
    studentId,
    hostelId,
    status: { $in: REVIEWABLE_BOOKING_STATUSES },
  });
  return Boolean(booking);
}

/**
 * Hostel ids this student is entitled to review and has not reviewed yet.
 * Drives the "Hostels you can review" prompt so the shelf can never offer a
 * hostel the API would then refuse.
 */
export async function pendingReviewHostelIds(studentId) {
  const [eligible, reviewed] = await Promise.all([
    Booking.distinct('hostelId', {
      studentId,
      status: { $in: REVIEWABLE_BOOKING_STATUSES },
    }),
    Review.distinct('hostelId', { studentId }),
  ]);

  const already = new Set(reviewed.map(String));
  return eligible.filter((id) => !already.has(String(id)));
}
