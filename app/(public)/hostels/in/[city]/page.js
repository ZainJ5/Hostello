import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';

import SeoLanding from '@/components/seo/SeoLanding';
import buildFacetGroups from '@/components/seo/facets';
import { cityCopy, cityRelated, thinNoticeFor } from '@/components/seo/copy';
import { landingTotal, loadLanding } from '@/components/seo/load';
import {
  SITE_URL,
  addedFilterCount,
  buildLandingQuery,
  cityFromSlug,
  cityPath,
  hrefFactory,
  parseLandingFilters,
  sortOptions,
} from '@/components/seo/catalog';

/**
 * `/hostels/in/[city]` : the city landing template, Figma seo-city 90:2816
 * and 90:2987.
 *
 * Coverage is honest rather than even: Islamabad 91, Rawalpindi 28, Lahore 3,
 * Karachi 2. The Karachi page therefore shows two results and says so, because
 * padding a thin page is how a directory loses the trust that brought the
 * student to it.
 *
 * Distance on a card here is measured to whichever campus that listing
 * actually names, computed from `lat`/`lng`, so a Rawalpindi listing is
 * described against FJWU rather than against a city centroid.
 */

const DEFAULT_SORT = 'relevance';

export const dynamic = 'force-dynamic';

/**
 * NO `generateStaticParams` HERE, AND WHY.
 *
 * The template takes filters, a sort and a page from the query string, which
 * makes it dynamically rendered whatever the param list says, so enumerating
 * the params would prerender nothing. Pairing it with `dynamicParams = false`
 * would give a routing level 404 for an unknown slug, which is tempting, but
 * it also needs a reachable database at build time and turns a build without
 * one into a site where every landing page 404s. The existence check runs in
 * `generateMetadata` instead, which is before the body streams, so the status
 * code is still right.
 */

/**
 * Raised here rather than in the page body: the browse segment's `loading.js`
 * puts every nested route behind a Suspense boundary, and once the body is
 * streaming a `notFound()` can no longer set the status code. See the campus
 * template for the full note.
 */
export async function generateMetadata({ params, searchParams }) {
  const city = cityFromSlug((await params).city);
  if (!city) notFound();

  const locked = { city };
  const filters = parseLandingFilters(await searchParams, locked, DEFAULT_SORT);
  const opts = { locked, defaultSort: DEFAULT_SORT };

  let total = null;
  try {
    await connectDB();
    total = await landingTotal(locked);
  } catch {
    total = null;
  }

  if (total === 0) notFound();

  const noun = total === 1 ? 'hostel' : 'hostels';
  const title = `Student hostels in ${city}`;
  const description = total
    ? `${total} student ${noun} in ${city}. Compare monthly rent, facilities and distance to campus, then contact the owner yourself with no agent in between.`
    : `Student hostels in ${city} on Hostello.`;

  const canonical = `${cityPath(city)}${buildLandingQuery(filters, { view: 'grid' }, opts)}`;
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

export default async function CityLandingPage({ params, searchParams }) {
  const { city: slug } = await params;
  const city = cityFromSlug(slug);
  if (!city) notFound();

  const sp = await searchParams;
  const locked = { city };
  const filters = parseLandingFilters(sp, locked, DEFAULT_SORT);

  await connectDB();
  const { rows, total, pages, facets, index, added, rentBands, stats } = await loadLanding({
    filters,
    locked,
  });

  if (stats.total === 0) notFound();

  const basePath = cityPath(city);
  const opts = { locked, defaultSort: DEFAULT_SORT };
  const hrefFor = hrefFactory(basePath, filters, opts);
  const copy = cityCopy(city, stats);

  return (
    <SeoLanding
      siteUrl={SITE_URL}
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: basePath, label: city },
      ]}
      title={copy.title}
      intro={copy.intro}
      headline={copy.headline(total)}
      basePath={basePath}
      filters={filters}
      hrefFor={hrefFor}
      locked={locked}
      defaultSort={DEFAULT_SORT}
      sortOptions={sortOptions()}
      facetGroups={buildFacetGroups({
        kind: 'city',
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
      thinNotice={added === 0 ? thinNoticeFor(`in ${city}`, stats.total) : null}
      faqs={copy.faqs}
      related={cityRelated(city, index)}
    />
  );
}
