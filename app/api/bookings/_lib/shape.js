/**
 * Shared read-shape for a student's own bookings. Kept out of `route.js`
 * because Next.js only permits route handler exports from that file.
 */

/**
 * The subset of the listing a student may see attached to their own booking.
 * `contact` is selected here but stripped by `redactContact` unless the request
 * has been confirmed. An owner's phone number is exactly what they are trading
 * for a confirmation, so it is not handed out on a pending or rejected one.
 */
export const HOSTEL_FIELDS =
  'name slug city area images price gender rating reviewCount status contact';

export function redactContact(booking) {
  if (!booking) return booking;
  const row = { ...booking };
  if (row.status !== 'confirmed' && row.hostelId && typeof row.hostelId === 'object') {
    const hostel = { ...row.hostelId };
    delete hostel.contact;
    row.hostelId = hostel;
  }
  return row;
}
