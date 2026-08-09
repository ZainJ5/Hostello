/**
 * Campus distance, computed rather than read.
 *
 * Listings carry a stored `distanceKm`, but only 66 of 124 have one and it
 * only ever described the nearest campus, so it cannot answer "and how far is
 * COMSATS?". Latitude and longitude are on all 124, so every figure on the
 * site is computed here with `haversineKm` and the stored field is never read.
 *
 * Straight line only. There is no routing, no isochrone and no walk time, and
 * `lib/distance.js` carries the note that says so.
 */

import { haversineKm } from '@/lib/utils';
import { CAMPUSES, campusesInCity, getCampus } from './campuses';

/** A listing has usable coordinates only when both are finite and non-zero. */
export function hasCoords(hostel) {
  const { lat, lng } = hostel || {};
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

function km(hostel, campus) {
  return haversineKm(hostel.lat, hostel.lng, campus.lat, campus.lng);
}

/**
 * The one campus a listing card names.
 *
 * When a campus filter is active that is the campus a student is measuring
 * from, so the card answers the question they actually asked. With no filter
 * the card falls back to the nearest campus the listing is tagged with.
 * Returns null when nothing can be measured, and the card then omits the line
 * rather than showing a zero.
 */
export function cardCampus(hostel, preferred) {
  if (!hasCoords(hostel)) return null;

  const wanted = preferred ? getCampus(preferred) : null;
  if (wanted) return { label: wanted.name, km: km(hostel, wanted) };

  const tagged = (hostel.universities || []).map((u) => getCampus(u)).filter(Boolean);
  if (!tagged.length) return null;

  const nearest = tagged
    .map((c) => ({ label: c.name, km: km(hostel, c) }))
    .sort((a, b) => a.km - b.km)[0];

  return nearest || null;
}

/**
 * The full table on a listing page: every campus the listing is tagged with,
 * then anything else in the same city close enough to be worth naming. A
 * campus 30 km away is not a campus this hostel is near, so the second set is
 * capped at 12 km.
 */
export function campusRows(hostel, limit = 8) {
  if (!hasCoords(hostel)) return [];

  const tagged = (hostel.universities || []).map((u) => getCampus(u)).filter(Boolean);
  const seen = new Set(tagged.map((c) => c.name));

  const nearby = campusesInCity(hostel.city)
    .filter((c) => !seen.has(c.name))
    .map((c) => ({ campus: c, km: km(hostel, c), tagged: false }))
    .filter((r) => r.km <= 12);

  return [
    ...tagged.map((c) => ({ campus: c, km: km(hostel, c), tagged: true })),
    ...nearby,
  ]
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((r) => ({ ...r, full: CAMPUSES[r.campus.name]?.full || r.campus.full }));
}
