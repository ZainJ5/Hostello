import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';

import SeoLanding from '@/components/seo/SeoLanding';
import buildFacetGroups from '@/components/seo/facets';
import { campusCopy, campusRelated, thinNoticeFor } from '@/components/seo/copy';
import { landingTotal, loadLanding } from '@/components/seo/load';
import {
  CAMPUS_NAMES,
  DISTANCE_SORT,
  SITE_URL,
  addedFilterCount,
  buildLandingQuery,
  campusFromSlug,
  campusPath,
  campusSlug,
  hrefFactory,
  parseLandingFilters,
  sortOptions,
} from '@/components/seo/catalog';

/**
 * `/hostels/near/[campus]` : the campus landing template, Figma seo-campus
 * 90:2582 and 90:2753.
 *
 * ROUTE SHAPE. Figma proposes `/hostels/[city]`, which cannot exist beside the
 * `/hostels/[slug]` listing route, so the agreed URLs put the intent in the
 * path: `near` for a campus, `in` for a city. That also stops a campus named
 * the same as a hostel slug from ever being ambiguous.
 *
 * This page is the acquisition channel, so everything renders on the server,
 * every filter is a link, and results are numbered pages rather than an
 * infinite scroll that would leave listing 13 onwards with no URL.
 *
 * Default sort is distance from the main gate, which is the one ordering a
 * student arriving on "hostels near NUST" has already asked for.
 */

const DEFAULT_SORT = DISTANCE_SORT.value;

export const dynamic = 'force-dynamic';

/**
 * Only campuses that actually have listings. A page for a campus with nothing
 * behind it is a thin page in the exact place a thin page costs most, so it is
 * never generated and 404s if it is asked for directly.
 *
 * The database is the source of truth here rather than the campus catalogue,
 * and a build without a reachable database simply resolves these on demand.
 */
export async function generateStaticParams() {
  try {
    await connectDB();
    const names = await Hostel.distinct('universities', { status: 'published' });
    return names
      .filter((n) => CAMPUS_NAMES.includes(n))
      .map((n) => ({ campus: campusSlug(n) }));
  } catch {
    return [];
  }
}

/**
 * The existence check lives here rather than in the page body on purpose.
 *
 * `app/(public)/hostels/loading.js` wraps every nested route in a Suspense
 * boundary, so by the time the page component runs the response has already
 * begun streaming and a `notFound()` can only be sent as a noindexed body with
 * a 200 status. Metadata is resolved before the body is streamed, so raising
 * the 404 here is what gets a real 404 on the wire, which is what a crawler
 * needs on the acquisition channel.
 */
export async function generateMetadata({ params, searchParams }) {
  const campus = campusFromSlug((await params).campus);
  if (!campus) notFound();

  const locked = { university: campus.name };
  const filters = parseLandingFilters(await searchParams, locked, DEFAULT_SORT);
  const opts = { locked, defaultSort: DEFAULT_SORT };

  // A database that is momentarily unreachable must not turn every landing
  // page into a 404, so an error leaves the count unknown rather than zero.
  let total = null;
  try {
    await connectDB();
    total = await landingTotal(locked);
  } catch {
    total = null;
  }

  // A campus nobody has listed anything near is not a page.
  if (total === 0) notFound();

  const noun = total === 1 ? 'hostel' : 'hostels';
  const title = `Hostels near ${campus.name}`;
  const description = total
    ? `${total} student ${noun} near ${campus.full}, ${campus.city}. Compare monthly rent, facilities and straight line distance from the main gate, then contact the owner yourself.`
    : `Student hostels near ${campus.full}, ${campus.city}, on Hostello.`;

  // `view` is a display preference rather than a different resource, so it
  // never reaches the canonical URL. A narrowed or paged variant is a near
  // duplicate of the landing page and is followed but not indexed, which is
  // the same policy browse applies.
  const canonical = `${campusPath(campus.name)}${buildLandingQuery(filters, { view: 'grid' }, opts)}`;
  const narrowed = addedFilterCount(filters, locked) > 0 || filters.page > 1;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${canonical}`,
      title: `${title} | Hostello`,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
    ...(narrowed ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CampusLandingPage({ params, searchParams }) {
  const { campus: slug } = await params;
  const campus = campusFromSlug(slug);
  if (!campus) notFound();

  const sp = await searchParams;
  const locked = { university: campus.name };
  const filters = parseLandingFilters(sp, locked, DEFAULT_SORT);

  await connectDB();
  const { rows, total, pages, facets, index, added, rentBands, stats } = await loadLanding({
    filters,
    locked,
    campusName: campus.name,
  });

  // A campus nobody has listed anything near is not a page.
  if (stats.total === 0) notFound();

  const basePath = campusPath(campus.name);
  const opts = { locked, defaultSort: DEFAULT_SORT };
  const hrefFor = hrefFactory(basePath, filters, opts);
  const copy = campusCopy(campus, stats);

  return (
    <SeoLanding
      siteUrl={SITE_URL}
      breadcrumb={[
        { href: '/', label: 'Home' },
        { label: 'Campuses' },
        { href: basePath, label: campus.name },
      ]}
      title={copy.title}
      intro={copy.intro}
      headline={copy.headline(total)}
      basePath={basePath}
      filters={filters}
      hrefFor={hrefFor}
      locked={locked}
      defaultSort={DEFAULT_SORT}
      sortOptions={sortOptions({ withDistance: true })}
      facetGroups={buildFacetGroups({
        kind: 'campus',
        locked,
        filters,
        facets,
        index,
        rentBands,
        hrefFor,
      })}
      clearHref={basePath}
      addedCount={added}
      rows={rows}
      total={total}
      pages={pages}
      campusName={campus.name}
      thinNotice={added === 0 ? thinNoticeFor(`near ${campus.name}`, stats.total) : null}
      faqs={copy.faqs}
      related={campusRelated(campus, index)}
    />
  );
}
