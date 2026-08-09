import { notFound } from 'next/navigation';

import { connectDB } from '@/lib/db';
import Hostel from '@/models/Hostel';

import SeoLanding from '@/components/seo/SeoLanding';
import buildFacetGroups from '@/components/seo/facets';
import { genderCityCopy, genderCityRelated, thinNoticeFor } from '@/components/seo/copy';
import { landingTotal, loadLanding } from '@/components/seo/load';
import {
  CITY_NAMES,
  SITE_URL,
  addedFilterCount,
  buildLandingQuery,
  cityFromSlug,
  cityPath,
  citySlug,
  genderCityPath,
  genderFromSlug,
  genderSlugFor,
  hrefFactory,
  parseLandingFilters,
  sortOptions,
} from '@/components/seo/catalog';

/**
 * `/hostels/in/[city]/[gender]` : the narrowest of the three landing
 * templates, Figma seo-gender-city 90:3050 and 90:3221.
 *
 * "girls hostel islamabad" is the search, so the word in the URL is the word
 * a student types, not the value the column stores. `girls` maps to `Female`,
 * `boys` to `Male` and `mixed` to `Mixed`.
 *
 * Only combinations with listings behind them exist. Karachi has no female
 * listings at all today, so `/hostels/in/karachi/girls` is a 404 rather than
 * an empty page that would rank for a search it cannot answer.
 */

const DEFAULT_SORT = 'relevance';

export const dynamic = 'force-dynamic';

/**
 * Every city and gender pair that has at least one published listing, read off
 * the database rather than assumed from the vocabulary.
 */
export async function generateStaticParams() {
  try {
    await connectDB();
    const rows = await Hostel.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: { city: '$city', gender: '$gender' } } },
    ]);

    return rows
      .map((r) => ({
        city: r._id.city,
        slug: genderSlugFor(r._id.gender),
      }))
      .filter((r) => r.slug && CITY_NAMES.includes(r.city))
      .map((r) => ({ city: citySlug(r.city), gender: r.slug }));
  } catch {
    return [];
  }
}

/**
 * Raised here rather than in the page body, for the reason recorded on the
 * campus template: the browse segment's `loading.js` starts the stream before
 * the page runs, and a `notFound()` after that cannot set the status code.
 */
export async function generateMetadata({ params, searchParams }) {
  const p = await params;
  const city = cityFromSlug(p.city);
  const gender = genderFromSlug(p.gender);
  if (!city || !gender) notFound();

  const locked = { city, gender: gender.value };
  const filters = parseLandingFilters(await searchParams, locked, DEFAULT_SORT);
  const opts = { locked, defaultSort: DEFAULT_SORT };

  let total = null;
  try {
    await connectDB();
    total = await landingTotal(locked);
  } catch {
    total = null;
  }

  // Karachi has no female listings, so that pair is a 404 and not an empty
  // page ranking for a search it cannot answer.
  if (total === 0) notFound();

  const word = gender.word;
  const noun = total === 1 ? 'hostel' : 'hostels';
  const title = `${word[0].toUpperCase()}${word.slice(1)} hostels in ${city}`;
  const description = total
    ? `${total} ${word} student ${noun} in ${city}. Compare monthly rent, facilities and distance to campus, then contact the owner directly.`
    : `${word[0].toUpperCase()}${word.slice(1)} student hostels in ${city} on Hostello.`;

  const canonical = `${genderCityPath(city, p.gender)}${buildLandingQuery(filters, { view: 'grid' }, opts)}`;
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

export default async function GenderCityLandingPage({ params, searchParams }) {
  const p = await params;
  const city = cityFromSlug(p.city);
  const gender = genderFromSlug(p.gender);
  if (!city || !gender) notFound();

  const sp = await searchParams;
  const locked = { city, gender: gender.value };
  const filters = parseLandingFilters(sp, locked, DEFAULT_SORT);

  await connectDB();
  const { rows, total, pages, facets, index, added, rentBands, stats } = await loadLanding({
    filters,
    locked,
  });

  if (stats.total === 0) notFound();

  const slug = p.gender.toLowerCase();
  const basePath = genderCityPath(city, slug);
  const opts = { locked, defaultSort: DEFAULT_SORT };
  const hrefFor = hrefFactory(basePath, filters, opts);
  const copy = genderCityCopy(city, gender, stats);

  return (
    <SeoLanding
      siteUrl={SITE_URL}
      breadcrumb={[
        { href: '/', label: 'Home' },
        { href: cityPath(city), label: city },
        { href: basePath, label: copy.title },
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
        kind: 'gender',
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
      thinNotice={
        added === 0 ? thinNoticeFor(`for ${gender.word} hostels in ${city}`, stats.total) : null
      }
      faqs={copy.faqs}
      related={genderCityRelated(city, slug, index)}
    />
  );
}
