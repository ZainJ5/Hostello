import { connectDB } from '@/lib/db';
import { handler, ok } from '@/lib/api';
import { serialize } from '@/lib/utils';
import { parseFilters } from '@/components/hostels/filters';
import { searchHostels } from '@/components/hostels/query';

/**
 * GET /api/hostels: the public read API behind the browse page and the map.
 *
 * ── Query parameters ────────────────────────────────────────────────────────
 * Everything `/hostels` accepts, parsed by the same `parseFilters`, so a browse
 * URL's query string can be handed to this endpoint verbatim:
 *
 *   q           string     free text across name / area / city / description /
 *                          universities (case-insensitive substring)
 *   city        csv        "Islamabad,Rawalpindi" (matches any)
 *   university  string     exact campus name, e.g. "NUST"
 *   gender      string     "Male" | "Female" | "Mixed"
 *   minPrice    int        PKR; ignored at the 5000 floor
 *   maxPrice    int        PKR; ignored at the 35000 ceiling
 *   facilities  csv        must have ALL of them
 *   sort        enum       relevance | price-asc | price-desc | rating | newest
 *   page        int        1-based, default 1
 *
 * Two parameters exist only here:
 *
 *   limit       int        page size, default 12, hard-capped at 500
 *   bounds      string     "swLat,swLng,neLat,neLng" viewport box for the map;
 *                          malformed values are ignored rather than erroring
 *   facets      "0"        skip the facet aggregation when the caller only
 *                          wants markers (saves one round trip)
 *
 * ── Response ────────────────────────────────────────────────────────────────
 * {
 *   hostels: [{
 *     _id, slug, name, city, area, universities[], gender,
 *     price, priceMin, priceMax, rating, reviewCount,
 *     images[], facilities[], verified, featured, available, distanceKm,
 *     lat, lng
 *   }],
 *   total:  number,               // matches across every page
 *   page:   number,               // echo of the requested page
 *   pages:  number,               // ceil(total / limit), never below 1
 *   facets: {                     // null when facets=0
 *     cities:       [{ value, count }],   // count ignores the city filter
 *     universities: [{ value, count }],   // count ignores the university filter
 *     facilities:   [{ value, count }],   // count ignores the facility filter
 *     genders:      [{ value, count }],   // count ignores the gender filter
 *     total:        number
 *   }
 * }
 *
 * Every listing object is safe to hand straight to `<HostelCard>`. Only
 * `status: 'published'` rows are ever returned.
 */
export const GET = handler(async (req) => {
  await connectDB();

  const sp = req.nextUrl.searchParams;
  const filters = parseFilters(sp);

  const limit = Number(sp.get('limit')) || undefined;
  const bounds = sp.get('bounds') || undefined;
  const withFacets = sp.get('facets') !== '0';

  const result = await searchHostels(filters, { bounds, limit, withFacets });

  return ok({
    hostels: serialize(result.hostels),
    total: result.total,
    page: result.page,
    pages: result.pages,
    facets: result.facets,
  });
});
