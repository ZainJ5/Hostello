import { haversineKm } from '@/lib/utils';
import {
  CAMPUS_BY_ID,
  CITIES,
  GENDERS,
  PRICE_CEIL,
  PRICE_FLOOR,
  RADIUS_OPTIONS,
  UNIVERSITIES,
} from './config';

export const DEFAULT_FILTERS = {
  city: '',
  university: '',
  gender: '',
  minPrice: PRICE_FLOOR,
  maxPrice: PRICE_CEIL,
  campus: '',
  radius: 0,
  live: true,
};

function one(v) {
  return Array.isArray(v) ? v[0] : v;
}

function pick(v, allowed) {
  const s = one(v);
  return allowed.includes(s) ? s : '';
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

function num(v, fallback) {
  const n = Number(one(v));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Turns raw `searchParams` (server) or a `URLSearchParams` snapshot (client)
 * into a validated filter object. Anything unrecognised is dropped rather than
 * trusted, so a hand-edited URL can never produce a broken query.
 */
export function parseFilters(sp = {}) {
  const raw = typeof sp?.get === 'function' ? Object.fromEntries(sp.entries()) : sp || {};

  const lo = clamp(num(raw.minPrice, PRICE_FLOOR), PRICE_FLOOR, PRICE_CEIL);
  const hi = clamp(num(raw.maxPrice, PRICE_CEIL), PRICE_FLOOR, PRICE_CEIL);
  const campus = CAMPUS_BY_ID[one(raw.campus)] ? one(raw.campus) : '';
  const radius = num(raw.radius, 0);

  return {
    city: pick(raw.city, CITIES),
    university: pick(raw.university, UNIVERSITIES),
    gender: pick(raw.gender, GENDERS),
    minPrice: Math.min(lo, hi),
    maxPrice: Math.max(lo, hi),
    campus,
    radius: campus && RADIUS_OPTIONS.includes(radius) ? radius : 0,
    live: one(raw.live) !== '0',
  };
}

/** Serialises only what differs from the default, keeping shared URLs short. */
export function filtersToQuery(f) {
  const p = new URLSearchParams();
  if (f.city) p.set('city', f.city);
  if (f.university) p.set('university', f.university);
  if (f.gender) p.set('gender', f.gender);
  if (f.minPrice > PRICE_FLOOR) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice < PRICE_CEIL) p.set('maxPrice', String(f.maxPrice));
  if (f.campus) p.set('campus', f.campus);
  if (f.campus && f.radius) p.set('radius', String(f.radius));
  if (!f.live) p.set('live', '0');
  return p;
}

export function activeFilterCount(f) {
  let n = 0;
  if (f.city) n++;
  if (f.university) n++;
  if (f.gender) n++;
  if (f.minPrice > PRICE_FLOOR || f.maxPrice < PRICE_CEIL) n++;
  if (f.campus) n++;
  if (f.campus && f.radius) n++;
  return n;
}

export function hasActiveFilters(f) {
  return activeFilterCount(f) > 0;
}

/** Mongo-side filters, re-applied on the client so an unknown query param on
 *  the API can never leak a row the user filtered out. */
export function matchesFilters(h, f) {
  if (f.city && h.city !== f.city) return false;
  if (f.university && !(h.universities || []).includes(f.university)) return false;
  if (f.gender && h.gender !== f.gender) return false;

  const price = Number(h.price) || 0;
  if (f.minPrice > PRICE_FLOOR && price < f.minPrice) return false;
  if (f.maxPrice < PRICE_CEIL && price > f.maxPrice) return false;

  return true;
}

export function hasCoords(h) {
  return (
    Number.isFinite(Number(h?.lat)) &&
    Number.isFinite(Number(h?.lng)) &&
    Number(h.lat) !== 0 &&
    Number(h.lng) !== 0
  );
}

/** Adds `campusDistanceKm` so the list and the radius filter agree exactly. */
export function withCampusDistance(hostels, campus) {
  if (!campus) return hostels;
  return hostels.map((h) => ({
    ...h,
    campusDistanceKm: haversineKm(campus.lat, campus.lng, Number(h.lat), Number(h.lng)),
  }));
}

export function withinRadius(h, radiusKm) {
  if (!radiusKm) return true;
  return Number(h.campusDistanceKm) <= radiusKm;
}

export function inBounds(h, b) {
  if (!b) return true;
  const lat = Number(h.lat);
  const lng = Number(h.lng);
  return lat >= b.swLat && lat <= b.neLat && lng >= b.swLng && lng <= b.neLng;
}

/** `swLat,swLng,neLat,neLng`, the shape `/api/hostels` expects. */
export function boundsToParam(b) {
  if (!b) return '';
  return [b.swLat, b.swLng, b.neLat, b.neLng].map((n) => n.toFixed(5)).join(',');
}

/** Rent in map-pin shorthand: 12000 → "12k", 12500 → "12.5k", 0 → "Ask". */
export function shortPrice(n) {
  const v = Number(n) || 0;
  if (v <= 0) return 'Ask';
  if (v < 1000) return String(Math.round(v));
  const k = v / 1000;
  return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
}

export function formatDistance(km) {
  const v = Number(km);
  if (!Number.isFinite(v)) return '';
  if (v < 1) return `${Math.round(v * 1000)} m`;
  return `${v.toFixed(1)} km`;
}
