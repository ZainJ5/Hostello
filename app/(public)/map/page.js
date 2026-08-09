import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import MapExplorer from '@/components/map/MapExplorer';
import { MAX_RESULTS, PRICE_CEIL, PRICE_FLOOR } from '@/components/map/config';
import { parseFilters } from '@/components/map/filters';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const DESCRIPTION =
  'Every published student hostel in Islamabad, Rawalpindi, Lahore and Karachi on one map. ' +
  'Filter by campus, rent and who can stay, and read the rent straight off the marker.';

export const metadata = {
  title: 'Hostels on a map',
  description: DESCRIPTION,
  alternates: { canonical: '/map' },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/map`,
    title: 'Hostels on a map | Hostello',
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image', title: 'Hostels on a map', description: DESCRIPTION },
};

/** A listing with no coordinates cannot be placed, so it is not counted. */
const PLACEABLE = { status: 'published', lat: { $ne: 0 }, lng: { $ne: 0 } };

const LIST_FIELDS =
  'name slug city area universities gender price priceMin priceMax rating reviewCount ' +
  'images facilities verified featured available lat lng distanceKm';

/**
 * The client fetches `/api/hostels` for every viewport change, but the first
 * paint is rendered on the server: the result list is then present in the HTML
 * for crawlers, for keyboard users, and before the Leaflet chunk has landed.
 * A database that is momentarily unreachable degrades to an empty list rather
 * than a 500, and the client fills it in from the API.
 */
async function loadInitialHostels(filters) {
  const query = { ...PLACEABLE };

  if (filters.city) query.city = filters.city;
  if (filters.university) query.universities = filters.university;
  if (filters.gender) query.gender = filters.gender;

  if (filters.minPrice > PRICE_FLOOR || filters.maxPrice < PRICE_CEIL) {
    query.price = {};
    if (filters.minPrice > PRICE_FLOOR) query.price.$gte = filters.minPrice;
    if (filters.maxPrice < PRICE_CEIL) query.price.$lte = filters.maxPrice;
  }

  try {
    await connectDB();
    const [rows, total] = await Promise.all([
      Hostel.find(query)
        .select(LIST_FIELDS)
        .sort({ featured: -1, rating: -1 })
        .limit(MAX_RESULTS)
        .lean(),
      Hostel.countDocuments(PLACEABLE),
    ]);
    return { hostels: serialize(rows), total };
  } catch {
    return { hostels: [], total: 0 };
  }
}

export default async function MapPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const { hostels, total } = await loadInitialHostels(filters);

  return <MapExplorer initialHostels={hostels} initialFilters={filters} total={total} />;
}
