/**
 * Canonical URL <-> filter-state mapping for `/hostels` and `GET /api/hostels`.
 *
 * The browse page, the filter UI and the read API all import from here, so a
 * URL pasted into a new tab reproduces the exact same result set, and the map
 * agent can build a query string without guessing at parameter names.
 *
 * Wire format (every parameter is optional):
 *   q           free text            "girls hostel h-13"
 *   city        comma separated      "Islamabad,Rawalpindi"
 *   university  single value         "NUST"
 *   gender      single value         "Male" | "Female" | "Mixed"
 *   minPrice    integer PKR          omitted when it equals PRICE_MIN
 *   maxPrice    integer PKR          omitted when it equals PRICE_MAX
 *   facilities  comma separated      "WiFi,Meals"
 *   sort        see SORTS            omitted when "relevance"
 *   view        grid | list          omitted when "grid" (browse page only)
 *   page        1-based integer      omitted when 1
 *
 * Defaults are never serialised, so the canonical URL for "no filters" is a
 * bare `/hostels`.
 */

/*
 * This module is imported by Client Components, so it must never reach for
 * `@/models/Hostel` — that would drag mongoose (and `tls`/`net`) into the
 * browser bundle. The facility vocabulary travels the other way instead: the
 * server pads it into `facets.facilities`, so the filter UI still renders the
 * canonical list without owning a copy of it.
 */

export const PAGE_SIZE = 12;

/** Slider domain. Matches the seeded corpus (PKR 5,000 – 35,000 entry rents). */
export const PRICE_MIN = 5000;
export const PRICE_MAX = 35000;
export const PRICE_STEP = 500;

export const GENDERS = ['Male', 'Female', 'Mixed'];

export const SORTS = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest first' },
];

export const VIEWS = ['grid', 'list'];

export const DEFAULT_FILTERS = {
  q: '',
  city: [],
  university: '',
  gender: '',
  minPrice: PRICE_MIN,
  maxPrice: PRICE_MAX,
  facilities: [],
  sort: 'relevance',
  view: 'grid',
  page: 1,
};

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/** Accepts an awaited `searchParams` object or a `URLSearchParams`. */
function readerFor(sp) {
  if (sp && typeof sp.get === 'function') return (k) => sp.get(k);
  return (k) => {
    const v = sp?.[k];
    return Array.isArray(v) ? v[0] : v ?? null;
  };
}

function splitList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Turns raw query input into a fully defaulted, validated filter object. */
export function parseFilters(sp) {
  const get = readerFor(sp);

  const rawSort = get('sort');
  const sort = SORTS.some((s) => s.value === rawSort) ? rawSort : 'relevance';

  const rawView = get('view');
  const view = VIEWS.includes(rawView) ? rawView : 'grid';

  const rawGender = get('gender');
  const gender = GENDERS.includes(rawGender) ? rawGender : '';

  const nMin = Number(get('minPrice'));
  const nMax = Number(get('maxPrice'));
  let minPrice = Number.isFinite(nMin) && nMin > 0 ? clamp(nMin, PRICE_MIN, PRICE_MAX) : PRICE_MIN;
  let maxPrice = Number.isFinite(nMax) && nMax > 0 ? clamp(nMax, PRICE_MIN, PRICE_MAX) : PRICE_MAX;
  if (minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];

  const page = Math.max(1, Math.floor(Number(get('page')) || 1));

  return {
    q: String(get('q') || '').trim().slice(0, 120),
    // Cities are free-form in the data, so they are not validated against a
    // whitelist — an unknown city simply matches nothing.
    city: splitList(get('city')).slice(0, 8),
    university: String(get('university') || '').trim().slice(0, 60),
    gender,
    minPrice,
    maxPrice,
    // Not checked against the vocabulary: an unknown facility is harmless
    // because `$all` simply matches nothing, which is the honest result for a
    // hand-edited URL.
    facilities: splitList(get('facilities'))
      .map((f) => f.slice(0, 40))
      .slice(0, 12),
    sort,
    view,
    page,
  };
}

/** Serialises a filter object back to a query string, omitting every default. */
export function buildQuery(filters, patch = {}) {
  const f = { ...DEFAULT_FILTERS, ...filters, ...patch };
  const p = new URLSearchParams();

  if (f.q) p.set('q', f.q);
  if (f.city?.length) p.set('city', f.city.join(','));
  if (f.university) p.set('university', f.university);
  if (f.gender) p.set('gender', f.gender);
  if (f.minPrice > PRICE_MIN) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice < PRICE_MAX) p.set('maxPrice', String(f.maxPrice));
  if (f.facilities?.length) p.set('facilities', f.facilities.join(','));
  if (f.sort && f.sort !== 'relevance') p.set('sort', f.sort);
  if (f.view && f.view !== 'grid') p.set('view', f.view);
  if (f.page > 1) p.set('page', String(f.page));

  const s = p.toString();
  return s ? `?${s}` : '';
}

/** `/hostels` href for a filter object plus an optional patch. */
export function hostelsHref(filters, patch = {}) {
  return `/hostels${buildQuery(filters, patch)}`;
}

/** True when the filter differs from the default in any way a user can see. */
export function hasActiveFilters(f) {
  return activeFilterCount(f) > 0;
}

/** Powers the badge on the mobile "Filters" button. Sort/view/page don't count. */
export function activeFilterCount(f) {
  let n = 0;
  if (f.q) n += 1;
  n += f.city?.length || 0;
  if (f.university) n += 1;
  if (f.gender) n += 1;
  if (f.minPrice > PRICE_MIN || f.maxPrice < PRICE_MAX) n += 1;
  n += f.facilities?.length || 0;
  return n;
}

/**
 * Flattens the active filter state into removable chips. Each chip carries the
 * patch that removes just itself, so the chip row can render plain links and
 * keep working with JavaScript disabled.
 */
export function toChips(f) {
  const chips = [];

  if (f.q) chips.push({ id: `q`, group: 'Search', label: `“${f.q}”`, patch: { q: '' } });

  for (const c of f.city || []) {
    chips.push({
      id: `city:${c}`,
      group: 'City',
      label: c,
      patch: { city: f.city.filter((x) => x !== c) },
    });
  }

  if (f.university) {
    chips.push({
      id: 'university',
      group: 'University',
      label: `Near ${f.university}`,
      patch: { university: '' },
    });
  }

  if (f.gender) {
    chips.push({ id: 'gender', group: 'For', label: `${f.gender} only`, patch: { gender: '' } });
  }

  if (f.minPrice > PRICE_MIN || f.maxPrice < PRICE_MAX) {
    chips.push({
      id: 'price',
      group: 'Budget',
      label: `${f.minPrice.toLocaleString('en-PK')} – ${f.maxPrice.toLocaleString('en-PK')} PKR`,
      patch: { minPrice: PRICE_MIN, maxPrice: PRICE_MAX },
    });
  }

  for (const fac of f.facilities || []) {
    chips.push({
      id: `fac:${fac}`,
      group: 'Facility',
      label: fac,
      patch: { facilities: f.facilities.filter((x) => x !== fac) },
    });
  }

  return chips;
}

/**
 * "124 hostels near NUST" — the headline above the grid. Kept here so the
 * browse page and the API-driven map share one phrasing.
 */
export function resultsSummary(total, f) {
  const noun = total === 1 ? 'hostel' : 'hostels';
  if (f.university) return `${total} ${noun} near ${f.university}`;
  if (f.city?.length === 1) return `${total} ${noun} in ${f.city[0]}`;
  if (f.city?.length > 1) return `${total} ${noun} in ${f.city.length} cities`;
  if (f.q) return `${total} ${noun} matching “${f.q}”`;
  return `${total} ${noun} across Pakistan`;
}
