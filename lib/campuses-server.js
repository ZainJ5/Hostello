import University from '@/models/University';
import { applyCampusRows } from '@/components/hostels/campus-registry';

const TTL_MS = 60 * 1000;

const cache = (globalThis.__hostelloCampusCache ||= { rows: [], at: 0, loading: null });

function toRow(u) {
  return {
    key: u.key,
    full: u.full,
    city: u.city,
    sector: u.sector || '',
    lat: u.lat,
    lng: u.lng,
    active: u.active !== false,
  };
}

/**
 * Loads admin universities and applies them to the shared campus lists.
 * Cached for a minute so every request does not hit the collection, and
 * never throws: a failure just leaves the built-in list in place.
 */
export async function loadCampusRows({ force = false } = {}) {
  const fresh = Date.now() - cache.at < TTL_MS;
  if (!force && fresh) return cache.rows;
  if (!force && cache.loading) return cache.loading;

  cache.loading = (async () => {
    try {
      const docs = await University.find({}).sort({ key: 1 }).lean();
      cache.rows = docs.map(toRow);
      cache.at = Date.now();
      applyCampusRows(cache.rows);
    } catch (err) {
      console.error('[campuses] could not load universities', err?.message || err);
      cache.at = Date.now();
    } finally {
      cache.loading = null;
    }
    return cache.rows;
  })();
  return cache.loading;
}

export function cachedCampusRows() {
  return cache.rows;
}
