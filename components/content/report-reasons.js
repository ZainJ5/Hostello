/**
 * The report vocabulary, shared by the form, the API route and the model.
 *
 * Plain data with no mongoose import, so a Client Component can read it
 * without dragging the database driver into the browser bundle. This is the
 * same split `components/student/constants.js` already uses.
 *
 * The urgency word next to each reason is a promise the safety page makes in
 * writing, so the two have to say the same thing. Urgent means the listing
 * comes down while we check rather than after.
 */
export const REPORT_REASONS = [
  {
    value: 'payment-before-visit',
    label: 'Somebody asked me for money before a visit',
    note: 'Treated as urgent, same day',
    urgent: true,
  },
  {
    value: 'not-the-owner',
    label: 'The person I met was not the owner or the warden',
    note: 'Treated as urgent, same day',
    urgent: true,
  },
  {
    value: 'felt-unsafe',
    label: 'I felt unsafe at this hostel',
    note: 'Treated as urgent, same day',
    urgent: true,
  },
  {
    value: 'wrong-rent',
    label: 'The rent or the deposit is wrong',
    note: 'Checked within a week',
    urgent: false,
  },
  {
    value: 'wrong-photos',
    label: 'The photos are not this building',
    note: 'Checked within a week',
    urgent: false,
  },
  {
    value: 'closed',
    label: 'The hostel has closed',
    note: 'Checked within a week',
    urgent: false,
  },
];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value);

export const URGENT_REPORT_REASONS = REPORT_REASONS.filter((r) => r.urgent).map((r) => r.value);

export function reportReason(value) {
  return REPORT_REASONS.find((r) => r.value === value) || null;
}

/** The shortest report a person can actually act on. */
export const MIN_REPORT_DETAILS = 20;
