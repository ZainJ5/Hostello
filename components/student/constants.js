/**
 * Constants shared between the student pages, the student client components
 * and the bookings / reviews / saved APIs.
 *
 * `ROOM_TYPES` and `BOOKING_STATUSES` are deliberately re-declared here rather
 * than imported from `@/models/*`: a Client Component that imports a model
 * would drag mongoose into the browser bundle. The model files remain the
 * source of truth. These lists mirror them and are asserted against the enum
 * on the server before anything is written.
 */

/** Mirrors `ROOM_TYPES` in @/models/Hostel. */
export const ROOM_TYPES = ['Single', 'Double', 'Triple', 'Quad', 'Dormitory'];

/** Mirrors `BOOKING_STATUSES` in @/models/Booking. */
export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
];

/** Filter rail on /dashboard/bookings. `all` is a UI-only pseudo status. */
export const BOOKING_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * A booking is only "live" in these two states. Used to block a second
 * request for the same hostel and to unlock the review form.
 */
export const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];
export const REVIEWABLE_BOOKING_STATUSES = ['confirmed', 'completed'];

/** Tenancy lengths students actually ask for, in months. */
export const DURATION_OPTIONS = [1, 2, 3, 4, 6, 9, 12, 18, 24];
export const MAX_DURATION_MONTHS = 36;

/** The sub-scores a review may carry, in the order they are shown. */
export const REVIEW_SUBSCORES = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'food', label: 'Food' },
  { key: 'security', label: 'Security' },
  { key: 'location', label: 'Location' },
  { key: 'valueForMoney', label: 'Value for money' },
];

export const MIN_REVIEW_LENGTH = 20;

/** Exactly the fields `HostelCard` reads, which keeps every card query identical. */
export const HOSTEL_CARD_FIELDS =
  '_id slug name city area universities gender price priceMin priceMax ' +
  'rating reviewCount images facilities verified featured available distanceKm';

export const GENDERS = ['Male', 'Female', 'Other'];

/** Cities and universities Hostello currently covers. */
export const CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

export const UNIVERSITIES = [
  'NUST',
  'FAST',
  'QAU',
  'COMSATS',
  'NUML',
  'SZABIST',
  'Riphah',
  'RMU',
  'FJWU',
  'Arid Agriculture',
  'Air University',
  'Bahria University',
  'Foundation University',
  'IIUI',
  'LUMS',
  'UET',
  'Punjab University',
  'IBA',
  'NED',
];

/**
 * "Today" for a Pakistani student, as `YYYY-MM-DD`. The server may well run in
 * UTC, so deriving the date from `Date.now()` directly would reject a valid
 * same-day move-in for five hours every night. Both the `min` attribute on the
 * date input and the API's past-date check call this, so they can never
 * disagree.
 */
export function todayInPK() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

/** `2026-08-05` -> Date at UTC midnight, so the stored day never shifts. */
export function isoDateToUTC(iso) {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Date object -> `YYYY-MM-DD` for a date input's value. */
export function toISODate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** "6 months" / "1 month", used everywhere a duration is rendered. */
export function formatDuration(months) {
  const n = Number(months) || 0;
  if (n === 12) return '1 year';
  if (n === 24) return '2 years';
  return `${n} month${n === 1 ? '' : 's'}`;
}
