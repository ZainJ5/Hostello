import { connectDB } from '@/lib/db';
import { cn, serialize } from '@/lib/utils';

import { TITLE } from '@/components/public/type';
import Container from '@/components/public/Container';
import Button from '@/components/ds/Button';
import HostelCard from '@/components/ds/HostelCard';
import Pagination from '@/components/ds/Pagination';
import ViewToggle from '@/components/ds/ViewToggle';
import { EmptyState } from '@/components/ds/Feedback';

import Breadcrumbs from '@/components/hostels/Breadcrumbs';
import BrowseSort from '@/components/hostels/BrowseSort';
import FilterRail from '@/components/hostels/FilterRail';
import HostelRow from '@/components/hostels/HostelRow';
import MobileFilterSheet from '@/components/hostels/MobileFilterSheet';
import { cardCampus } from '@/components/hostels/campus-distance';
import { browseCrumbs, browseSummary, browseTitle } from '@/components/hostels/browse-copy';
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  activeFilterCount,
  hasActiveFilters,
  hostelsHref,
  parseFilters,
} from '@/components/hostels/filters';
import { searchHostels } from '@/components/hostels/query';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const f = parseFilters(await searchParams);
  const title = browseTitle(f);

  // Filtered permutations are near duplicates of the clean list, so only the
  // unfiltered first page is worth indexing. Every variant still passes link
  // equity through, and the key is omitted rather than set to `undefined`,
  // because an explicit undefined unsets the root layout's directive instead
  // of inheriting it.
  const narrowed = hasActiveFilters(f) || f.page > 1;

  const description =
    `Compare ${title.toLowerCase()} on Hostello. Filter by campus, monthly rent and what is ` +
    'included, see how far each one sits from your university, then contact the owner ' +
    'yourself. No commission and no finder fee.';

  return {
    title,
    description,
    // `view` is a display preference, not a different resource, so it never
    // reaches the canonical URL.
    alternates: { canonical: hostelsHref(f, { view: 'grid' }) },
    openGraph: {
      title,
      description,
      url: hostelsHref(f, { view: 'grid' }),
      type: 'website',
    },
    ...(narrowed ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * NO loading.js AND NO SUSPENSE ON THIS ROUTE, DELIBERATELY. Both were tried
 * and both were measured, and each one costs something this page cannot pay.
 *
 * A `loading.js` here wraps every route below it, including /hostels/[slug],
 * and a streamed response has already sent its status line by the time a page
 * calls `notFound()`. With one in place, a listing that no longer exists
 * answered 200 with the not found page inside it, which is a soft 404 and
 * keeps a delisted hostel in Google's index.
 *
 * Moving the boundary into the page as a Suspense fallback fixed the status
 * but cost the whole point of the page: measured against a production build,
 * the resolved boundary never reaches the HTML at all. The document carried
 * the skeleton and the twelve listings arrived only in the flight payload, so
 * the results existed for a browser running JavaScript and for nothing else.
 * The directory lives on Google and every result set has to be in the markup.
 *
 * So the page blocks on its own query. It is one indexed find plus one facet
 * aggregation, the header renders from the URL alone, and the whole document
 * is server rendered.
 */
export default async function HostelsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  await connectDB();
  const { hostels, total, pages, facets } = await searchHostels(filters);

  const rows = serialize(hostels);
  const summary = browseSummary(total, filters);
  const count = activeFilterCount(filters);
  const isList = filters.view === 'list';

  const hrefForPage = (p) => hostelsHref(filters, { page: p });
  const hrefForView = (v) => hostelsHref(filters, { view: v });

  const rail = <FilterRail filters={filters} facets={facets} />;

  return (
    <>
      {/* ── Band one: where you are and what you are looking at ── */}
      <Container as="section" className="flex flex-col gap-6 pb-7 pt-7">
        <Breadcrumbs items={browseCrumbs(filters)} />
        <h1 className={cn(TITLE, 'text-balance text-ds-ink')}>{browseTitle(filters)}</h1>
        <p className="ds-body-l max-w-[75ch] text-pretty text-ds-ink-muted">
          {total} {total === 1 ? 'listing' : 'listings'}, every one checked by a person before
          it went live. Filter by campus, rent and what is included, then contact the owner
          yourself. Hostello takes no commission and holds no rooms.
        </p>
      </Container>

      {/* ── Band two: the rail and the results ── */}
      <Container as="section" className="pb-16 pt-2 lg:pt-8">
        <div className="grid items-start gap-10 lg:grid-cols-[18.75rem_minmax(0,1fr)]">
          {/* The rail sticks on desktop and sizes to its own content, so a
              short filter set does not leave a tall empty column. */}
          <aside
            aria-label="Filter hostels"
            className="ds-elevated sticky top-4 hidden max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-ds-inner p-5 lg:block"
          >
            {rail}
          </aside>

          <div className="min-w-px">
            {/* Toolbar. On a phone this is the only route to the rail, so it
                carries the sheet trigger and sits on the sunken surface that
                separates it from the results. */}
            <div className="-mx-4 mb-6 flex flex-wrap items-center gap-3 bg-ds-surface-sunken px-4 py-3 lg:mx-0 lg:mb-5 lg:bg-transparent lg:px-0 lg:py-0">
              <p className="ds-body-m order-3 w-full text-ds-ink lg:order-1 lg:w-auto lg:min-w-px lg:flex-1">
                {summary}
              </p>

              <MobileFilterSheet count={count} className="order-1 lg:hidden">
                {rail}
              </MobileFilterSheet>

              <BrowseSort
                filters={filters}
                className="order-2 min-w-px flex-1 lg:order-3 lg:w-60 lg:flex-none"
              />

              <ViewToggle
                view={filters.view}
                hrefFor={hrefForView}
                className="order-4 hidden sm:flex"
              />
            </div>

            {rows.length > 0 ? (
              <ul
                className={
                  isList
                    ? 'grid grid-cols-1 gap-4'
                    : 'grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3'
                }
              >
                {rows.map((hostel, i) => {
                  const campus = cardCampus(hostel, filters.university);
                  return (
                    <li key={hostel._id} className="min-w-px">
                      {isList ? (
                        <HostelRow hostel={hostel} campus={campus} priority={i < 3} />
                      ) : (
                        // The first row is above the fold at every width.
                        <HostelCard hostel={hostel} campus={campus} priority={i < 3} />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : total > 0 ? (
              <EmptyState
                title="Nothing on this page"
                body={`There ${total === 1 ? 'is' : 'are'} ${total} matching ${
                  total === 1 ? 'hostel' : 'hostels'
                }, but page ${filters.page} is past the end of the list.`}
                action={
                  <Button href={hostelsHref(filters, { page: 1 })}>Back to page 1</Button>
                }
              />
            ) : (
              <EmptyState
                title="No hostels match those filters"
                body="Nothing in the directory fits every constraint at once. Loosening the rent band or dropping one facility usually brings results straight back."
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      href={hostelsHref(DEFAULT_FILTERS, {
                        sort: filters.sort,
                        view: filters.view,
                      })}
                    >
                      Clear filters
                    </Button>
                    {filters.q ? (
                      <Button
                        href={hostelsHref(filters, { q: '', page: 1 })}
                        variant="secondary"
                      >
                        Keep filters, drop the search
                      </Button>
                    ) : null}
                  </div>
                }
              />
            )}

            <Pagination
              page={filters.page}
              pages={pages}
              total={total}
              perPage={PAGE_SIZE}
              hrefFor={hrefForPage}
              className="mt-8"
            />
          </div>
        </div>
      </Container>
    </>
  );
}
