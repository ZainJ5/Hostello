/**
 * Server-only data layer for the three SEO landing templates.
 *
 * The whole published catalogue is 124 rows, so a landing page reads every row
 * that matches its context in one query and then sorts and paginates in
 * JavaScript. That is what makes `Closest to campus` possible at all: the
 * distance is computed from `lat`/`lng` against a campus centroid and does not
 * exist in Mongo, so it cannot be a `$sort` stage or a `skip`.
 *
 * The facet counts still come from the shared aggregation in
 * `components/hostels/query.js`, so a landing page and browse can never
 * disagree about how many hostels are in Rawalpindi.
 */

import Hostel from '@/models/Hostel';
import { DEFAULT_FILTERS, PAGE_SIZE, PRICE_MAX, PRICE_MIN } from '@/components/hostels/filters';
import { buildMongoQuery, searchHostels } from '@/components/hostels/query';
import { serialize } from '@/lib/utils';
import { distanceBand } from '@/lib/distance';
import {
  RENT_BANDS,
  addedFilterCount,
  campusDistance,
  matchesRentBand,
  nearestCampusDistance,
} from './catalog';

/** Enough to hold the entire catalogue, and the cap the read API enforces. */
const ALL = 500;

/**
 * The rent rows are the one facet Mongo cannot count for us, because they are
 * band overlaps rather than an equality on a field. They are counted against
 * every other active filter but not against the rent filter itself, which is
 * the same rule `facetCounts` applies to the four aggregated dimensions.
 */
function rentBandCounts(rows) {
  return RENT_BANDS.map((band) => ({
    ...band,
    count: rows.reduce((n, h) => n + (matchesRentBand(h, band) ? 1 : 0), 0),
  }));
}

function rentOf(h) {
  const min = Number(h.priceMin) || 0;
  const max = Number(h.priceMax) || 0;
  const base = Number(h.price) || 0;
  return { low: min || base, high: max || min || base };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
}

/**
 * Everything the copy on the page is allowed to claim. Every figure here is
 * counted off the rows themselves, so no sentence can outrun the data.
 */
export function landingStats(rows, campusName) {
  const lows = rows.map((h) => rentOf(h).low).filter((n) => n > 0).sort((a, b) => a - b);
  const highs = rows.map((h) => rentOf(h).high).filter((n) => n > 0).sort((a, b) => a - b);

  const genders = { Female: 0, Male: 0, Mixed: 0 };
  const cities = {};
  const campuses = {};
  const facilities = {};
  const bands = { walkable: 0, 'a short ride': 0, 'a commute': 0 };

  let verified = 0;
  let withPhone = 0;
  let nearestKm = null;

  for (const h of rows) {
    if (genders[h.gender] !== undefined) genders[h.gender] += 1;
    cities[h.city] = (cities[h.city] || 0) + 1;
    for (const u of h.universities || []) campuses[u] = (campuses[u] || 0) + 1;
    for (const f of h.facilities || []) facilities[f] = (facilities[f] || 0) + 1;
    if (h.verified) verified += 1;
    if (h.contact?.phone) withPhone += 1;

    const d = campusName ? campusDistance(h, campusName) : nearestCampusDistance(h);
    if (d) {
      const band = distanceBand(d.km);
      if (band && bands[band] !== undefined) bands[band] += 1;
      if (nearestKm === null || d.km < nearestKm) nearestKm = d.km;
    }
  }

  return {
    total: rows.length,
    verified,
    withPhone,
    genders,
    cities,
    facilities,
    bands,
    nearestKm,
    rentLow: lows[0] || 0,
    rentHigh: highs[highs.length - 1] || 0,
    // The middle half of the range, which is what "normally costs" means.
    rentTypicalLow: percentile(lows, 0.25),
    rentTypicalHigh: percentile(highs, 0.75),
    topCampuses: Object.entries(campuses)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

/**
 * Exact totals for every landing page in the directory, in one aggregation.
 *
 * A facet count answers "how many are left if I tick this here", which is the
 * right number beside a filter and the wrong number beside a link that leaves
 * the page. `Student hostels in Islamabad` sitting on the NUST page must read
 * 91, the count of the page it goes to, not 35, the count of Islamabad
 * listings that also name NUST. This index is what makes that possible, and it
 * is the same for every page, so it is one query rather than a special case
 * per link.
 */
export async function directoryIndex() {
  const [raw] = await Hostel.aggregate([
    { $match: { status: 'published' } },
    {
      $facet: {
        cities: [{ $group: { _id: '$city', n: { $sum: 1 } } }],
        cityGender: [{ $group: { _id: { c: '$city', g: '$gender' }, n: { $sum: 1 } } }],
        campuses: [
          { $unwind: '$universities' },
          { $group: { _id: '$universities', n: { $sum: 1 } } },
        ],
        campusGender: [
          { $unwind: '$universities' },
          { $group: { _id: { u: '$universities', g: '$gender' }, n: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const byCity = {};
  const byCityGender = {};
  const byCampus = {};
  const byCampusGender = {};

  for (const r of raw?.cities || []) byCity[r._id] = r.n;
  for (const r of raw?.cityGender || []) byCityGender[`${r._id.c}|${r._id.g}`] = r.n;
  for (const r of raw?.campuses || []) byCampus[r._id] = r.n;
  for (const r of raw?.campusGender || []) byCampusGender[`${r._id.u}|${r._id.g}`] = r.n;

  return { byCity, byCityGender, byCampus, byCampusGender };
}

/**
 * The count for one landing context and nothing else, so `generateMetadata`
 * can put a real number in the description without loading a page of rows.
 */
export async function landingTotal(locked = {}) {
  return Hostel.countDocuments(
    buildMongoQuery({
      ...DEFAULT_FILTERS,
      city: locked.city ? [locked.city] : [],
      university: locked.university || '',
      gender: locked.gender || '',
    })
  );
}

function sortRows(rows, sort, campusName) {
  if (sort !== 'distance') return rows;
  return [...rows].sort((a, b) => {
    const da = campusName ? campusDistance(a, campusName) : nearestCampusDistance(a);
    const db = campusName ? campusDistance(b, campusName) : nearestCampusDistance(b);
    // A listing with no usable coordinates sorts last rather than first.
    const ka = da ? da.km : Number.POSITIVE_INFINITY;
    const kb = db ? db.km : Number.POSITIVE_INFINITY;
    return ka - kb;
  });
}

/**
 * Runs the landing query and returns the page of rows, the facet counts, and
 * the statistics the prose and the FAQ are built from.
 *
 * `stats` is deliberately computed against the route on its own, never against
 * the visitor's extra filters: "91 hostels in Islamabad" has to keep saying 91
 * after someone ticks WiFi.
 */
export async function loadLanding({ filters, locked, campusName = '' }) {
  const added = addedFilterCount(filters, locked);
  const pricePinned = filters.minPrice > PRICE_MIN || filters.maxPrice < PRICE_MAX;

  const { hostels, total, facets } = await searchHostels(
    { ...filters, page: 1 },
    { limit: ALL }
  );

  const rows = serialize(hostels);
  const sorted = sortRows(rows, filters.sort, campusName);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (filters.page - 1) * PAGE_SIZE;
  const page = sorted.slice(start, start + PAGE_SIZE);

  // Rent rows are counted with the rent filter lifted and everything else left
  // in place. When no rent filter is on, that is the set already in hand.
  let priceFreeRows = rows;
  if (pricePinned) {
    const wide = await searchHostels(
      { ...filters, page: 1, minPrice: PRICE_MIN, maxPrice: PRICE_MAX },
      { limit: ALL, withFacets: false }
    );
    priceFreeRows = serialize(wide.hostels);
  }

  // The prose and the FAQ describe the landing page, not the visitor's
  // narrowing of it: "91 hostels in Islamabad" has to keep saying 91 after
  // someone ticks WiFi. One extra read, and only when they have.
  let contextRows = rows;
  if (added > 0) {
    const clean = await searchHostels(
      {
        ...filters,
        page: 1,
        q: '',
        city: locked.city ? [locked.city] : [],
        university: locked.university || '',
        gender: locked.gender || '',
        facilities: [],
        minPrice: PRICE_MIN,
        maxPrice: PRICE_MAX,
      },
      { limit: ALL, withFacets: false }
    );
    contextRows = serialize(clean.hostels);
  }

  return {
    rows: page,
    total,
    pages,
    facets,
    added,
    index: await directoryIndex(),
    rentBands: rentBandCounts(priceFreeRows),
    stats: landingStats(contextRows, campusName),
  };
}
