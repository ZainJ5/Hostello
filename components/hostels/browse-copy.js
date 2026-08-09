/**
 * Wording and URL shapes for the browse page, kept out of the page file so the
 * headline, the breadcrumb trail and the metadata can never drift apart.
 *
 * Nothing here talks to Mongo. The filter contract itself lives in
 * `filters.js` and is used exactly as it is.
 */

import { PRICE_MAX, PRICE_MIN, SORTS, hostelsHref } from './filters';

/**
 * The sort menu in the design's words, derived from the canonical `SORTS` so
 * the two lists cannot drift and an option can never be offered that the query
 * layer does not implement.
 *
 * DIVERGENCE, RECORDED. The design lists six sorts and two of them,
 * "Closest to campus" and "Most reviewed", have no spec in query.js. Adding
 * them means changing the sort vocabulary that `GET /api/hostels` shares, so
 * they are absent here. "Top rated" is a working sort the design drops and it
 * is kept.
 */
const SORT_WORDS = {
  relevance: 'Recommended',
  'price-asc': 'Rent low to high',
  'price-desc': 'Rent high to low',
  rating: 'Top rated',
  newest: 'Newest listing',
};

export const SORT_OPTIONS = SORTS.map((s) => ({
  value: s.value,
  label: SORT_WORDS[s.value] || s.label,
}));

/** Girls and boys, because that is what students and their parents say. */
export function genderWord(gender) {
  if (gender === 'Female') return 'Girls';
  if (gender === 'Male') return 'Boys';
  if (gender === 'Mixed') return 'Mixed';
  return '';
}

/** The row label in the "Who can stay" group. */
export function genderLabel(gender) {
  if (gender === 'Female') return 'Female only';
  if (gender === 'Male') return 'Male only';
  return 'Mixed';
}

/**
 * The H1. Figma reads "Girls hostels in Islamabad", which is the filter state
 * written out as a sentence rather than a static page title.
 */
export function browseTitle(f) {
  const who = genderWord(f.gender);
  const noun = who ? `${who} hostels` : 'Student hostels';

  if (f.q) return `${noun} matching “${f.q}”`;
  if (f.university) return `${noun} near ${f.university}`;
  if (f.city?.length === 1) return `${noun} in ${f.city[0]}`;
  if (f.city?.length > 1) return `${noun} in ${f.city.join(' and ')}`;
  return `${noun} in Pakistan`;
}

/** The count line above the grid, in the same voice as the H1. */
export function browseSummary(total, f) {
  const noun = total === 1 ? 'hostel' : 'hostels';
  const who = genderWord(f.gender).toLowerCase();
  const head = `${total} ${who ? `${who} ` : ''}${noun}`;

  if (f.university) return `${head} near ${f.university}`;
  if (f.city?.length === 1) return `${head} in ${f.city[0]}`;
  if (f.city?.length > 1) return `${head} in ${f.city.length} cities`;
  if (f.q) return `${head} matching “${f.q}”`;
  return `${head} across Pakistan`;
}

/** Home / Islamabad / Girls hostels / Page 1 */
export function browseCrumbs(f) {
  const crumbs = [{ href: '/', label: 'Home' }];

  if (f.city?.length === 1) {
    crumbs.push({ href: hostelsHref({ city: f.city }), label: f.city[0] });
  }

  const who = genderWord(f.gender);
  crumbs.push({
    href: hostelsHref({ city: f.city, gender: f.gender }),
    label: who ? `${who} hostels` : 'Hostels',
  });

  crumbs.push({ label: `Page ${f.page}` });
  return crumbs;
}

/**
 * Monthly rent as bands rather than the two handled slider the live site
 * carries, per the design's filter rail.
 *
 * DIVERGENCE, RECORDED. The design draws four bands, the top one "Over
 * 35,000". The URL contract in `filters.js` clamps rent to PKR 5,000 to
 * 35,000 and treats 35,000 as "no upper bound", so a band above it cannot be
 * expressed without changing that contract, which is shared with
 * `GET /api/hostels`. Two of 124 listings sit above 35,000 and they are
 * included in the top band here rather than being given a band of their own.
 */
export const RENT_BANDS = [
  { id: 'under-15', label: 'Under 15,000', minPrice: PRICE_MIN, maxPrice: 15000 },
  { id: '15-25', label: '15,000 to 25,000', minPrice: 15000, maxPrice: 25000 },
  { id: 'over-25', label: '25,000 and up', minPrice: 25000, maxPrice: PRICE_MAX },
];

export function activeRentBand(f) {
  return RENT_BANDS.find((b) => b.minPrice === f.minPrice && b.maxPrice === f.maxPrice) || null;
}

/** The patch that selects a band, or clears it when it is already on. */
export function rentBandPatch(f, band) {
  const on = activeRentBand(f)?.id === band.id;
  return on
    ? { minPrice: PRICE_MIN, maxPrice: PRICE_MAX }
    : { minPrice: band.minPrice, maxPrice: band.maxPrice };
}
