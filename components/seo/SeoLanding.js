import Link from 'next/link';

import HostelCard from '@/components/ds/HostelCard';
import Pagination from '@/components/ds/Pagination';
import ViewToggle from '@/components/ds/ViewToggle';
import Button from '@/components/ds/Button';
import { Alert, EmptyState } from '@/components/ds/Feedback';

import { PAGE_SIZE } from '@/components/hostels/filters';
import { DISTANCE_NOTE } from '@/lib/distance';
import { cn } from '@/lib/utils';

import Breadcrumb from './Breadcrumb';
import FacetPanel from './FacetPanel';
import Faq from './Faq';
import LandingSort from './LandingSort';
import RelatedSearches from './RelatedSearches';
import { campusDistance, nearestCampusDistance } from './catalog';

/**
 * The shell all three SEO landing templates share. seo-campus 90:2582,
 * seo-city 90:2816 and seo-gender-city 90:3050 are the same frame with
 * different copy, so they are one component with three callers rather than
 * three near-copies that drift apart on the fourth edit.
 *
 * Everything renders on the server. Pagination is numbered links, never
 * infinite scroll, so results 13 to 124 keep a URL a crawler can reach and a
 * student can share.
 *
 * MOBILE FILTERS. The frame draws a button that opens a sheet. This is a
 * native `details` whose panel is positioned over the results, which behaves
 * the same, needs no client bundle on the acquisition channel, and keeps the
 * whole facet set crawlable with scripting off.
 */

/** A hostel is described against the page's campus, or its own nearest one. */
function distanceFor(hostel, campusName) {
  return campusName ? campusDistance(hostel, campusName) : nearestCampusDistance(hostel);
}

function Results({ rows, view, campusName }) {
  return (
    <ul
      className={cn(
        'grid gap-5',
        view === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
      )}
    >
      {rows.map((hostel, i) => (
        <li key={hostel._id} className="min-w-0">
          <HostelCard
            hostel={hostel}
            campus={distanceFor(hostel, campusName)}
            priority={i < 3}
          />
        </li>
      ))}
    </ul>
  );
}

export default function SeoLanding({
  siteUrl,
  breadcrumb,
  title,
  intro,
  headline,
  basePath,
  filters,
  hrefFor,
  locked,
  defaultSort,
  sortOptions,
  facetGroups,
  clearHref,
  addedCount,
  rows,
  total,
  pages,
  campusName = '',
  thinNotice = null,
  faqs,
  related,
}) {
  const panel = (
    <FacetPanel groups={facetGroups} clearHref={clearHref} addedCount={addedCount} />
  );

  return (
    <div className="flex w-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 pb-10 pt-8 lg:px-20">
        <Breadcrumb items={breadcrumb} siteUrl={siteUrl} />
        <h1 className="ds-display-xl text-balance text-ds-ink">{title}</h1>
        <p className="ds-body-l max-w-[110ch] text-pretty text-ds-ink-muted">{intro}</p>
      </div>

      {/* ── Results ────────────────────────────────────────────────────── */}
      <div className="mx-auto grid w-full max-w-[90rem] grid-cols-1 items-start gap-6 px-4 pb-16 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10 lg:px-20">
        <aside aria-label="Filters" className="hidden lg:block">
          {panel}
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Toolbar. One sort control at both widths, so its label keeps a
              single target and nothing renders a duplicate id. */}
          <div className="-mx-4 flex flex-col gap-3 bg-ds-surface-sunken px-4 py-4 lg:mx-0 lg:bg-transparent lg:p-0">
            <div className="relative flex flex-wrap items-center gap-2">
              <details className="lg:hidden">
                <summary
                  className={cn(
                    'ds-body-m-strong ds-tap inline-flex cursor-pointer list-none items-center gap-2 px-4',
                    'rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt',
                    '[&::-webkit-details-marker]:hidden'
                  )}
                >
                  Filters
                  {addedCount > 0 ? (
                    <span className="ds-mono-meta text-ds-ink-muted">{addedCount}</span>
                  ) : null}
                </summary>
                <div
                  className="absolute inset-x-0 top-full z-30 mt-2"
                  style={{ boxShadow: 'var(--ds-shadow-menu)' }}
                >
                  {panel}
                </div>
              </details>

              <h2 className="ds-body-m-strong hidden min-w-px flex-1 text-ds-ink lg:block">
                {headline}
              </h2>

              <div className="flex min-w-px flex-1 items-center justify-end gap-1 lg:flex-none">
                <LandingSort
                  basePath={basePath}
                  filters={filters}
                  options={sortOptions}
                  locked={locked}
                  defaultSort={defaultSort}
                  className="min-w-px flex-1 lg:w-56 lg:flex-none"
                />
                <ViewToggle
                  view={filters.view}
                  hrefFor={(view) => hrefFor({ view })}
                  className="hidden sm:inline-flex"
                />
              </div>
            </div>

            <h2 className="ds-body-m-strong text-ds-ink lg:hidden">{headline}</h2>
          </div>

          {thinNotice ? (
            <Alert title={thinNotice.title}>{thinNotice.body}</Alert>
          ) : null}

          {rows.length ? (
            <Results rows={rows} view={filters.view} campusName={campusName} />
          ) : total > 0 ? (
            <EmptyState
              title="Nothing on this page"
              body={`There ${total === 1 ? 'is' : 'are'} ${total} matching ${total === 1 ? 'hostel' : 'hostels'}, but page ${filters.page} is past the end of the list.`}
              action={<Button href={hrefFor({ page: 1 })}>Back to page 1</Button>}
            />
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              body="Nothing on this page fits every constraint at once. Loosening the budget or dropping a facility usually brings results straight back."
              action={<Button href={basePath}>Clear the filters</Button>}
            />
          )}

          {pages > 1 ? (
            <Pagination
              page={filters.page}
              pages={pages}
              total={total}
              perPage={PAGE_SIZE}
              hrefFor={(p) => hrefFor({ page: p })}
              className="pt-4"
            />
          ) : null}

          <p className="ds-body-s max-w-[95ch] text-ds-ink-muted">{DISTANCE_NOTE}</p>
        </div>
      </div>

      {/* ── Sideways moves ─────────────────────────────────────────────── */}
      <div className="w-full border-t border-solid border-ds-hairline bg-ds-surface-sunken">
        <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-10 px-4 py-14 lg:px-20">
          <Faq items={faqs} />
          <RelatedSearches items={related} />
        </div>
      </div>
    </div>
  );
}

/** Shared by the three pages so the "no results here" wording stays identical. */
export function NoCoverage({ city }) {
  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-16 lg:px-20">
      <h1 className="ds-display-m text-ds-ink">Nothing listed here yet</h1>
      <p className="ds-body-m max-w-[70ch] text-ds-ink-muted">
        Hostello has no published listings for {city} at the moment.
      </p>
      <div>
        <Link
          href="/hostels"
          className="ds-body-m-strong text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
        >
          Browse every hostel
        </Link>
      </div>
    </div>
  );
}
