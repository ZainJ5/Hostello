/**
 * Client-safe vocabularies for the owner console.
 *
 * `FACILITIES` and `ROOM_TYPES` deliberately live in `@/models/Hostel` and are
 * NOT re-declared here — importing that file into a Client Component would drag
 * mongoose into the browser bundle. Server Components read them from the model
 * and pass them down as props.
 */

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

export const GENDERS = ['Male', 'Female', 'Mixed'];

/** Approximate city centres, used to sanity-check the coordinates an owner types. */
export const CITY_CENTRES = {
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
};

/** National bounding box — anything outside is almost certainly a typo. */
export const PK_BOUNDS = { minLat: 23.5, maxLat: 37.1, minLng: 60.8, maxLng: 77.9 };

export const SUGGESTED_RULES = [
  'No smoking inside the building',
  'Guests must sign in at reception',
  'Quiet hours after 11 PM',
  'Gate closes at midnight',
  'No cooking in rooms',
  'One month notice before vacating',
];

/** Owner-visible listing statuses, in lifecycle order. */
export const LISTING_STATUS_ORDER = [
  'draft',
  'pending_payment',
  'pending_review',
  'published',
  'rejected',
  'suspended',
];

/** What the owner has to do next for a listing in each state. */
export const NEXT_ACTION = {
  draft: {
    label: 'Finish the details',
    tone: 'neutral',
    hint: 'This listing is not visible to students yet.',
  },
  pending_payment: {
    label: 'Upload payment proof',
    tone: 'warning',
    hint: 'Transfer the listing fee and upload the screenshot to go live.',
  },
  pending_review: {
    label: 'Awaiting admin approval',
    tone: 'info',
    hint: 'We are checking your payment. This usually takes under 24 hours.',
  },
  published: {
    label: 'Live — nothing to do',
    tone: 'success',
    hint: 'Students can find and contact this listing.',
  },
  rejected: {
    label: 'Fix and resubmit',
    tone: 'danger',
    hint: 'An admin sent this back with a reason.',
  },
  suspended: {
    label: 'Contact support',
    tone: 'danger',
    hint: 'This listing was pulled from public view by an admin.',
  },
};
