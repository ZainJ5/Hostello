/**
 * The rows of the comparison table, and the rule that decides which exist.
 *
 * A row is only here when the field is populated on at least one listing in
 * the whole directory. The frame compares security deposit, first month total,
 * gate shuts and beds free; all four are empty on all 124 listings, so
 * comparing them would put four rows of "Not given" in the middle of the table
 * and teach a student nothing except that the product does not know anything.
 * They are named once underneath the table instead.
 *
 * What is left is what the directory actually holds: rent range, city, area,
 * who can stay, a computed campus distance, the verified badge, the facilities
 * the owner ticked, the legacy rating and whether there is a phone number.
 */

import { formatPKR } from '@/lib/utils';
import { distanceBand, formatKm } from '@/lib/distance';
import { campusDistance } from '@/components/seo/catalog';

/** Rendered where a listing has nothing, in the frame's own words. */
const NOT_GIVEN = { text: 'Not given', muted: true };

const cell = (text, extra = {}) => (text ? { text, ...extra } : NOT_GIVEN);

/** The facilities worth a row. Every one of these is ticked on real listings. */
const FACILITY_ROWS = [
  { value: 'Meals', label: 'Mess' },
  { value: 'WiFi', label: 'WiFi' },
  { value: 'Power Backup', label: 'Backup power' },
  { value: 'Security', label: 'Security' },
  { value: 'Laundry', label: 'Laundry' },
  { value: 'Study Room', label: 'Study room' },
];

function facilityCell(hostel, value) {
  const list = hostel.facilities || [];
  return list.includes(value)
    ? { text: 'Yes' }
    : // "Not listed" rather than "No": facilities are what the owner ticked, so
      // an absence is a gap in the record as often as it is a missing amenity.
      { text: 'Not listed', muted: true };
}

function ratingCell(hostel) {
  const rating = Number(hostel.rating) || 0;
  const count = Number(hostel.reviewCount) || 0;
  if (!rating) return NOT_GIVEN;
  if (!count) return { text: rating.toFixed(1), mono: true };
  return { text: `${rating.toFixed(1)} from ${count}`, mono: true };
}

/**
 * The campus the distance row measures from. Whichever campus the most of the
 * compared listings name, so the row is meaningful to the largest number of
 * them, and overridable from the URL.
 */
export function chooseCampus(hostels, preferred) {
  if (preferred) return preferred;

  const tally = {};
  for (const h of hostels) {
    for (const u of h.universities || []) tally[u] = (tally[u] || 0) + 1;
  }

  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ranked[0]?.[0] || '';
}

export function buildRows(hostels, campusName) {
  const rows = [
    {
      label: 'Lowest rent',
      cells: hostels.map((h) => {
        const low = Number(h.priceMin) || Number(h.price) || 0;
        return low ? { text: formatPKR(low), mono: true } : NOT_GIVEN;
      }),
    },
    {
      label: 'Highest rent',
      cells: hostels.map((h) => {
        const high = Number(h.priceMax) || Number(h.priceMin) || Number(h.price) || 0;
        return high ? { text: formatPKR(high), mono: true } : NOT_GIVEN;
      }),
    },
    { label: 'City', cells: hostels.map((h) => cell(h.city)) },
    { label: 'Area', cells: hostels.map((h) => cell(h.area)) },
    { label: 'Who can stay', cells: hostels.map((h) => cell(h.gender)) },
  ];

  if (campusName) {
    rows.push({
      label: `Distance to ${campusName}`,
      cells: hostels.map((h) => {
        const d = campusDistance(h, campusName);
        return d ? { text: formatKm(d.km), mono: true } : NOT_GIVEN;
      }),
    });
    rows.push({
      label: 'Band',
      cells: hostels.map((h) => {
        const d = campusDistance(h, campusName);
        return d ? cell(distanceBand(d.km)) : NOT_GIVEN;
      }),
    });
  }

  rows.push({
    label: 'Verified badge',
    cells: hostels.map((h) => (h.verified ? { text: 'Yes' } : { text: 'No', muted: true })),
  });

  for (const f of FACILITY_ROWS) {
    rows.push({ label: f.label, cells: hostels.map((h) => facilityCell(h, f.value)) });
  }

  rows.push({ label: 'Rating', cells: hostels.map(ratingCell) });

  rows.push({
    label: 'Phone number',
    cells: hostels.map((h) =>
      h.contact?.phone ? { text: 'On the listing' } : { text: 'Not given', muted: true }
    ),
  });

  return rows;
}

/** Said once under the table rather than as five rows of nothing inside it. */
export const ABSENT_NOTE =
  'Not given means the owner left the field empty rather than that the hostel does not have it. ' +
  'Security deposits, first month totals, room types, bed counts, house rules and gate timings are not compared at all, ' +
  'because no listing in the directory records them yet. Ratings are legacy aggregates carried over from the old site.';
