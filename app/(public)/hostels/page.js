import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';

import Container from '@/components/public/Container';
import Button from '@/components/ds/Button';
import HostelCard from '@/components/ds/HostelCard';
import Pagination from '@/components/ds/Pagination';
import SortSelect from '@/components/ds/SortSelect';
import ViewToggle from '@/components/ds/ViewToggle';
import { EmptyState } from '@/components/ds/Feedback';

import Breadcrumbs from '@/components/hostels/Breadcrumbs';
import FilterRail from '@/components/hostels/FilterRail';
import HostelRow from '@/components/hostels/HostelRow';
import MobileFilterSheet from '@/components/hostels/MobileFilterSheet';
import { cardCampus } from '@/components/hostels/campus-distance';
import {
  SORT_OPTIONS,
  browseCrumbs,
  browseSummary,
  browseTitle,
} from '@/components/hostels/browse-copy';
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
    openGraph: { title, description, url: hostelsHref(f, { view: 'grid' }), type: 'website' },
    ...(narrowed ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HostelsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  await connectDB();
  const { hostels, total, pages, facets } = await searchHostels(filters);

  const rows = serialize(hostels);
  const title = browseTitle(filters);
  const summary = browseSummary(total, filters);
  const count = activeFilterCount(filters);
  const isList = filters.view === 'list';

  const hrefForPage = (p) => hostelsHref(filters, { page: p });
  const hrefForSort = (s) => hostelsHref(filters, { sort: s, page: 1 });
  const hrefForView = (v) => hostelsHref(filters, { view: v });

  const rail = <FilterRail filters={filters} facets={facets} />;

  return (
    <>
      {/* ── Band one: where you are and what you are looking at ── */}
      <Container as="section" className="flex flex-col gap-6 pb-7 pt-7">
        <Breadcrumbs items={browseCrumbs(filters)} />
        <h1 className="ds-display-xl text-balance text-ds-ink">{title}</h1>
        <p className="ds-body-l max-w-[75ch] text-pretty text-ds-ink-muted">
          {total} {total === 1 ? 'listing' : 'listings'}, every one checked by a person before it
          went live. Filter by campus, rent and what is included, then contact the owner
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

              <SortSelect
                value={filters.sort}
                options={SORT_OPTIONS}
                hrefFor={hrefForSort}
                className="order-2 min-w-px flex-1 lg:order-3 lg:w-60 lg:flex-none"
              />

              <ViewToggle view={filters.view} hrefFor={hrefForView} className="order-4 hidden sm:flex" />
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
                action={<Button href={hostelsHref(filters, { page: 1 })}>Back to page 1</Button>}
              />
            ) : (
              <EmptyState
                title="No hostels match those filters"
                body="Nothing in the directory fits every constraint at once. Loosening the rent band or dropping one facility usually brings results straight back."
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      href={hostelsHref(DEFAULT_FILTERS, { sort: filters.sort, view: filters.view })}
                    >
                      Clear filters
                    </Button>
                    {filters.q ? (
                      <Button href={hostelsHref(filters, { q: '', page: 1 })} variant="secondary">
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
