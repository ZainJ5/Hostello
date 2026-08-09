import { formatPKR, haversineKm } from '@/lib/utils';
import { distanceBand, formatKm } from '@/lib/distance';
import { getCampus } from '@/components/hostels/campuses';

/** Everything a compact saved row renders, and nothing more. */
export const SAVED_ROW_FIELDS = '_id slug name city area priceMin priceMax price lat lng contact';

/**
 * The one meta line under a saved listing's name: distance to the student's
 * own campus, then the rent.
 *
 * Distance is computed from the listing's `lat`/`lng`, which all 124 listings
 * carry, and never from the stored `distanceKm`, which only half of them do.
 * It is omitted entirely when the student has not told us their university,
 * because there is then no origin to measure from and a distance to some other
 * campus would be a worse answer than none.
 *
 * Minutes are never rendered. The product measures a straight line and has no
 * routing, so a walk time would be an invented figure.
 */
export function savedRowMeta(hostel, university) {
  const parts = [];

  const campus = university ? getCampus(university) : null;
  if (campus && Number(hostel.lat) && Number(hostel.lng)) {
    const km = haversineKm(campus.lat, campus.lng, hostel.lat, hostel.lng);
    const label = formatKm(km);
    const band = distanceBand(km);
    if (label) parts.push(`${label} to ${campus.name}${band ? `, ${band}` : ''}`);
  }

  const min = Number(hostel.priceMin) || 0;
  const max = Number(hostel.priceMax) || 0;
  const base = Number(hostel.price) || 0;
  // The currency is named once at the front of the range, as the frame does.
  if (min && max && max > min) {
    parts.push(`${formatPKR(min)} to ${max.toLocaleString('en-PK')} a month`);
  } else if (min || base) {
    parts.push(`${formatPKR(min || base)} a month`);
  }

  return parts.length ? `${parts.join('. ')}.` : '';
}

/** A saved listing flattened to exactly what the row component reads. */
export function toSavedRow(hostel, university) {
  return {
    _id: String(hostel._id),
    slug: hostel.slug,
    name: hostel.name,
    meta: savedRowMeta(hostel, university),
    // A fifth of listings carry no phone at all, so the call action has to
    // degrade rather than render a dead tel: link.
    phone: hostel.contact?.phone || '',
  };
}
