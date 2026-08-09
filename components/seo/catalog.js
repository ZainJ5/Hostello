/**
 * Vocabulary and URL grammar for the three SEO landing templates.
 *
 * ROUTING, DECIDED CENTRALLY. Figma proposes `/hostels/[city]`, which collides
 * with the existing `/hostels/[slug]` listing route, and Next cannot carry two
 * dynamic segments at one level. The agreed URLs are:
 *
 *   /hostels/near/[campus]          Hostels near NUST
 *   /hostels/in/[city]              Student hostels in Islamabad
 *   /hostels/in/[city]/[gender]     Girls hostels in Islamabad
 *
 * Every landing page reuses the query grammar `/hostels` already speaks, so a
 * filter picked up here survives a move to browse and back. The one addition is
 * `sort=distance`, which only means anything when the page has a campus origin
 * to measure from.
 */

import {
  CAMPUSES,
  CAMPUS_NAMES,
  campusesInCity,
  getCampus,
} from '@/components/hostels/campuses';
import {
  PRICE_MAX,
  PRICE_MIN,
  SORTS,
  parseFilters,
} from '@/components/hostels/filters';
import { haversineKm, slugify } from '@/lib/utils';

/** The four cities the directory actually covers. */
export const CITY_NAMES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];

/** Re-exported so a route can validate a slug without importing two modules. */
export { CAMPUS_NAMES };

/** Absolute origin, needed by the structured data and the OG tags. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Gender lives in the URL as the word a student types into Google, not as the
 * value the database stores. "girls hostel islamabad" is the search; "Female"
 * is the column.
 */
export const GENDER_SLUGS = {
  girls: { value: 'Female', word: 'girls', chip: 'Female only' },
  boys: { value: 'Male', word: 'boys', chip: 'Male only' },
  mixed: { value: 'Mixed', word: 'mixed', chip: 'Mixed' },
};

export const GENDER_SLUG_LIST = Object.keys(GENDER_SLUGS);

/** Reverse lookup, so a Hostel.gender value can name its own landing page. */
export function genderSlugFor(value) {
  return GENDER_SLUG_LIST.find((k) => GENDER_SLUGS[k].value === value) || '';
}

/* ── Slugs ──────────────────────────────────────────────────────────────── */

export function campusSlug(name) {
  return slugify(name);
}

export function citySlug(name) {
  return slugify(name);
}

const CAMPUS_BY_SLUG = CAMPUS_NAMES.reduce((acc, name) => {
  acc[campusSlug(name)] = CAMPUSES[name];
  return acc;
}, {});

const CITY_BY_SLUG = CITY_NAMES.reduce((acc, name) => {
  acc[citySlug(name)] = name;
  return acc;
}, {});

export function campusFromSlug(slug) {
  return CAMPUS_BY_SLUG[String(slug || '').toLowerCase()] || null;
}

export function cityFromSlug(slug) {
  return CITY_BY_SLUG[String(slug || '').toLowerCase()] || null;
}

export function genderFromSlug(slug) {
  return GENDER_SLUGS[String(slug || '').toLowerCase()] || null;
}

/* ── Canonical hrefs ────────────────────────────────────────────────────── */

export function campusPath(name) {
  return `/hostels/near/${campusSlug(name)}`;
}

export function cityPath(name) {
  return `/hostels/in/${citySlug(name)}`;
}

export function genderCityPath(city, slug) {
  return `/hostels/in/${citySlug(city)}/${slug}`;
}

/* ── Sorting ────────────────────────────────────────────────────────────── */

/**
 * The browse vocabulary plus one option. `Closest to campus` is only offered
 * where the page itself supplies the origin to measure from, which is what the
 * component spec calls out: without a campus there is nothing to sort against.
 */
export const DISTANCE_SORT = { value: 'distance', label: 'Closest to campus' };

export function sortOptions({ withDistance = false } = {}) {
  if (!withDistance) return SORTS;
  const out = [...SORTS];
  out.splice(3, 0, DISTANCE_SORT);
  return out;
}

/* ── Filter state ───────────────────────────────────────────────────────── */

function readParam(sp, key) {
  if (sp && typeof sp.get === 'function') return sp.get(key);
  const v = sp?.[key];
  return Array.isArray(v) ? v[0] : (v ?? null);
}

/**
 * Parses the query string with the browse rules, then stamps the route's own
 * dimensions over the top. The route always wins: `/hostels/in/islamabad?city=Lahore`
 * is an Islamabad page, not a Lahore one.
 */
export function parseLandingFilters(sp, locked = {}, defaultSort = 'relevance') {
  const base = parseFilters(sp);

  const rawSort = readParam(sp, 'sort');
  const sort =
    rawSort === DISTANCE_SORT.value
      ? DISTANCE_SORT.value
      : SORTS.some((s) => s.value === rawSort)
        ? rawSort
        : defaultSort;

  return {
    ...base,
    sort,
    city: locked.city ? [locked.city] : base.city,
    university: locked.university || base.university,
    gender: locked.gender || base.gender,
  };
}

/**
 * Serialises a filter object back to a query string. A dimension the route
 * owns is never written out, because it is already in the path, and the page's
 * own default sort is omitted the same way `relevance` is on browse.
 */
export function buildLandingQuery(filters, patch = {}, opts = {}) {
  const { locked = {}, defaultSort = 'relevance' } = opts;
  const f = { ...filters, ...patch };
  const p = new URLSearchParams();

  if (f.q) p.set('q', f.q);
  if (!locked.city && f.city?.length) p.set('city', f.city.join(','));
  if (!locked.university && f.university) p.set('university', f.university);
  if (!locked.gender && f.gender) p.set('gender', f.gender);
  if (f.minPrice > PRICE_MIN) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice < PRICE_MAX) p.set('maxPrice', String(f.maxPrice));
  if (f.facilities?.length) p.set('facilities', f.facilities.join(','));
  if (f.sort && f.sort !== defaultSort) p.set('sort', f.sort);
  if (f.view && f.view !== 'grid') p.set('view', f.view);
  if (f.page > 1) p.set('page', String(f.page));

  const s = p.toString();
  return s ? `?${s}` : '';
}

/** `(patch) => href` for the current page, used by every control on it. */
export function hrefFactory(basePath, filters, opts) {
  return (patch = {}) => `${basePath}${buildLandingQuery(filters, patch, opts)}`;
}

/**
 * Counts only the filters the visitor added on top of the route. Sort, view
 * and page are display state and never count, and neither does a dimension the
 * path already fixes.
 */
export function addedFilterCount(filters, locked = {}) {
  let n = 0;
  if (filters.q) n += 1;
  if (!locked.city) n += filters.city?.length || 0;
  if (!locked.university && filters.university) n += 1;
  if (!locked.gender && filters.gender) n += 1;
  if (filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX) n += 1;
  n += filters.facilities?.length || 0;
  return n;
}

/* ── Rent bands ─────────────────────────────────────────────────────────── */

/**
 * The four rent rows in the frame, expressed in the price parameters browse
 * already understands. A listing carries a band (`priceMin` to `priceMax`) and
 * matches a row when the two bands overlap, which is the same rule the Mongo
 * filter uses, so the count beside the row and the result set behind it can
 * never disagree.
 *
 * The top row reads "35,000 and above" rather than the frame's "Over 35,000",
 * because `PRICE_MAX` is the ceiling of the slider domain and a listing sitting
 * exactly on it belongs in that row rather than nowhere.
 */
export const RENT_BANDS = [
  { key: 'under-15', label: 'Under 15,000', min: PRICE_MIN, max: 15000 },
  { key: '15-25', label: '15,000 to 25,000', min: 15000, max: 25000 },
  { key: '25-35', label: '25,000 to 35,000', min: 25000, max: PRICE_MAX },
  { key: 'over-35', label: '35,000 and above', min: PRICE_MAX, max: PRICE_MAX },
];

export function matchesRentBand(hostel, band) {
  const low = Number(hostel.priceMin) || Number(hostel.price) || 0;
  const high = Number(hostel.priceMax) || low;
  if (band.min > PRICE_MIN && high < band.min) return false;
  if (band.max < PRICE_MAX && low > band.max) return false;
  return true;
}

export function activeRentBand(filters) {
  return (
    RENT_BANDS.find((b) => b.min === filters.minPrice && b.max === filters.maxPrice) || null
  );
}

/* ── Distance ───────────────────────────────────────────────────────────── */

/**
 * Straight line kilometres from a listing to one named campus, computed from
 * `lat`/`lng`. The stored `distanceKm` is populated on 66 of 124 listings and
 * is never read.
 */
export function campusDistance(hostel, campusName) {
  const c = getCampus(campusName);
  const lat = Number(hostel?.lat);
  const lng = Number(hostel?.lng);
  if (!c || !Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return null;
  const km = haversineKm(c.lat, c.lng, lat, lng);
  return Number.isFinite(km) ? { label: c.name, km } : null;
}

/**
 * The closest campus the listing itself claims, falling back to every campus
 * in its city. A listing that names FJWU and Riphah is described against
 * whichever of those it is actually nearest to.
 */
export function nearestCampusDistance(hostel) {
  const claimed = (hostel?.universities || []).filter((u) => getCampus(u));
  const pool = claimed.length ? claimed : campusesInCity(hostel?.city).map((c) => c.name);

  let best = null;
  for (const name of pool) {
    const d = campusDistance(hostel, name);
    if (d && (!best || d.km < best.km)) best = d;
  }
  return best;
}

/** Every campus with a main gate in this city, in the catalogue's own order. */
export function cityCampuses(city) {
  return campusesInCity(city);
}
