/**
 * Server-only Mongo layer shared by the browse page and `GET /api/hostels`.
 * Keeping the filter, sort and facet builders in one module is what guarantees
 * the page and the API can never drift apart.
 */

import Hostel, { FACILITIES } from '@/models/Hostel';
import { GENDERS, PAGE_SIZE, PRICE_MAX, PRICE_MIN } from './filters';

/** Everything HostelCard needs, plus the coordinates the map consumes. */
export const CARD_PROJECTION = {
  slug: 1,
  name: 1,
  city: 1,
  area: 1,
  universities: 1,
  gender: 1,
  price: 1,
  priceMin: 1,
  priceMax: 1,
  rating: 1,
  reviewCount: 1,
  images: 1,
  facilities: 1,
  verified: 1,
  featured: 1,
  available: 1,
  distanceKm: 1,
  lat: 1,
  lng: 1,
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Text search deliberately uses case-insensitive regexes instead of the
 * `name/area/city/description` text index.
 *
 * `$text` only matches whole stemmed words, so the short prefixes people
 * actually type ("gul", "h-1", "nus") return nothing for "Gulberg", "H-12"
 * and "NUST". A regex gives true substring behaviour, matches inside sector
 * codes that Mongo's tokeniser splits apart, and lets us search the
 * `universities` array too (not part of the text index). Each whitespace
 * separated term must hit at least one field, so extra words narrow the result
 * set rather than widening it, which is what the text index would do.
 *
 * The trade-off is an unindexed scan, which stays sub-millisecond at the
 * current catalogue size. Past a few thousand rows this should become an Atlas
 * Search autocomplete index rather than `$text`.
 */
function textClause(q) {
  const terms = String(q || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (!terms.length) return null;

  return terms.map((t) => {
    const rx = new RegExp(escapeRegex(t), 'i');
    return {
      $or: [
        { name: rx },
        { area: rx },
        { city: rx },
        { description: rx },
        { universities: rx },
      ],
    };
  });
}

/** `swLat,swLng,neLat,neLng` -> a lat/lng box, or null when malformed. */
export function parseBounds(raw) {
  if (!raw) return null;
  const parts = String(raw)
    .split(',')
    .map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [swLat, swLng, neLat, neLng] = parts;
  return {
    lat: { $gte: Math.min(swLat, neLat), $lte: Math.max(swLat, neLat) },
    lng: { $gte: Math.min(swLng, neLng), $lte: Math.max(swLng, neLng) },
  };
}

function merge(...parts) {
  const out = {};
  for (const p of parts) if (p) Object.assign(out, p);
  return out;
}

/**
 * Splits the filter into the always-on base and the four facet dimensions, so
 * each facet can be counted against *every other* active filter but not
 * against itself. That is what keeps a checkbox list from collapsing to a
 * single option the moment you tick it.
 */
export function filterParts(filters, { bounds } = {}) {
  const f = filters;

  const base = { status: 'published' };

  const text = textClause(f.q);
  if (text) base.$and = text;

  // Listings carry a rent band (priceMin..priceMax); a listing matches when its
  // band overlaps the requested one. Slider extremes are treated as "no bound"
  // so the handful of listings whose top room exceeds PRICE_MAX aren't hidden
  // by an untouched control.
  if (f.minPrice > PRICE_MIN) base.priceMax = { $gte: f.minPrice };
  if (f.maxPrice < PRICE_MAX) base.priceMin = { $lte: f.maxPrice };

  const box = parseBounds(bounds);
  if (box) Object.assign(base, box);

  return {
    base,
    city: f.city?.length ? { city: { $in: f.city } } : null,
    university: f.university ? { universities: f.university } : null,
    gender: f.gender ? { gender: f.gender } : null,
    // $all, not $in: ticking two facilities means "has both".
    facilities: f.facilities?.length ? { facilities: { $all: f.facilities } } : null,
  };
}

/** The complete Mongo filter for the current state. */
export function buildMongoQuery(filters, opts) {
  const p = filterParts(filters, opts);
  return merge(p.base, p.city, p.university, p.gender, p.facilities);
}

const SORT_SPECS = {
  // `price` is 0 on some listings, so both price sorts key off the rent band
  // instead of the legacy scalar.
  'price-asc': { priceMin: 1, priceMax: 1 },
  'price-desc': { priceMax: -1, priceMin: -1 },
  rating: { rating: -1, reviewCount: -1 },
  newest: { publishedAt: -1, createdAt: -1 },
  relevance: { featured: -1, rating: -1, reviewCount: -1 },
};

/** `_id` tiebreak keeps pagination stable across pages with equal sort keys. */
export function sortSpec(sort) {
  return { ...(SORT_SPECS[sort] || SORT_SPECS.relevance), _id: 1 };
}

/**
 * One aggregation produces every facet count plus the authoritative total.
 * `$facet` re-runs the cheap sub-pipelines against the already-narrowed base
 * match, which is why this replaces ~30 individual `countDocuments` calls.
 */
export async function facetCounts(filters, opts) {
  const p = filterParts(filters, opts);

  const [raw] = await Hostel.aggregate([
    { $match: p.base },
    {
      $facet: {
        cities: [
          { $match: merge(p.university, p.gender, p.facilities) },
          { $group: { _id: '$city', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        universities: [
          { $match: merge(p.city, p.gender, p.facilities) },
          { $unwind: '$universities' },
          { $group: { _id: '$universities', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        facilities: [
          { $match: merge(p.city, p.university, p.gender) },
          { $unwind: '$facilities' },
          { $group: { _id: '$facilities', count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        genders: [
          { $match: merge(p.city, p.university, p.facilities) },
          { $group: { _id: '$gender', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        total: [
          { $match: merge(p.city, p.university, p.gender, p.facilities) },
          { $count: 'n' },
        ],
      },
    },
  ]);

  const shape = (rows) =>
    (rows || []).filter((r) => r._id).map((r) => ({ value: r._id, count: r.count }));

  /**
   * Pads a facet with the vocabulary values that scored zero, so a checkbox
   * never disappears mid-interaction. It greys out with a 0 beside it, which
   * tells the student something a missing row can't. This is also how the
   * canonical `FACILITIES` list reaches the client filter panel without the
   * browser bundle importing a mongoose model.
   */
  const padded = (rows, vocabulary) => {
    const present = shape(rows);
    const seen = new Set(present.map((r) => r.value));
    return [...present, ...vocabulary.filter((v) => !seen.has(v)).map((v) => ({ value: v, count: 0 }))];
  };

  return {
    cities: shape(raw?.cities),
    universities: shape(raw?.universities),
    facilities: padded(raw?.facilities, FACILITIES),
    genders: padded(raw?.genders, GENDERS),
    total: raw?.total?.[0]?.n || 0,
  };
}

/**
 * Runs the listing query and the facet aggregation together.
 * Returns `{ hostels, total, page, pages, facets }`, the exact shape
 * `GET /api/hostels` serialises.
 */
export async function searchHostels(filters, { bounds, limit, withFacets = true } = {}) {
  const perPage = Math.min(500, Math.max(1, Math.floor(limit || PAGE_SIZE)));

  const [facets, rows] = await Promise.all([
    withFacets ? facetCounts(filters, { bounds }) : Promise.resolve(null),
    Hostel.find(buildMongoQuery(filters, { bounds }), CARD_PROJECTION)
      .sort(sortSpec(filters.sort))
      .skip((filters.page - 1) * perPage)
      .limit(perPage)
      .lean(),
  ]);

  const total = facets
    ? facets.total
    : await Hostel.countDocuments(buildMongoQuery(filters, { bounds }));

  return {
    hostels: rows,
    total,
    page: filters.page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    facets,
  };
}
