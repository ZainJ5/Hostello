import Link from 'next/link';
import { MapPin, Map as MapIcon, SearchX, ShieldCheck, Sparkles } from 'lucide-react';

import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import HostelCard from '@/components/public/HostelCard';

import ActiveFilters from '@/components/hostels/ActiveFilters';
import FilterSidebar from '@/components/hostels/FilterSidebar';
import MobileFilterSheet from '@/components/hostels/MobileFilterSheet';
import Paginator from '@/components/hostels/Paginator';
import SortSelect from '@/components/hostels/SortSelect';
import ViewToggle from '@/components/hostels/ViewToggle';
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  buildQuery,
  hasActiveFilters,
  hostelsHref,
  parseFilters,
  resultsSummary,
} from '@/components/hostels/filters';
import { searchHostels } from '@/components/hostels/query';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const f = parseFilters(await searchParams);

  const where = f.university
    ? `near ${f.university}`
    : f.city.length
      ? `in ${f.city.join(' & ')}`
      : 'in Pakistan';
  const who = f.gender ? `${f.gender.toLowerCase()} ` : '';
  const title = f.q
    ? `“${f.q}”: student hostels ${where}`
    : `Student ${who}hostels ${where}`;

  // Filtered permutations are near-duplicates; only the clean list is worth
  // indexing, though every variant still passes link equity through. The key
  // is omitted entirely rather than set to `undefined`, because an explicit
  // `undefined` unsets the root layout's directive instead of inheriting it.
  const narrowed = hasActiveFilters(f) || f.page > 1;

  return {
    title,
    description: `Browse verified student ${who}hostels ${where} on Hostello. Compare monthly rent, facilities, photos and real student reviews, then contact the owner directly.`,
    // `view` is a display preference, not a different resource, so it never
    // reaches the canonical URL.
    alternates: { canonical: hostelsHref(f, { view: 'grid' }) },
    ...(narrowed ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HostelsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  await connectDB();
  const { hostels, total, pages, facets } = await searchHostels(filters);

  const rows = serialize(hostels);
  const summary = resultsSummary(total, filters);
  const from = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, filters.page * PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      {/* ── Page header ── */}
      <header className="max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/"
                className="cursor-pointer rounded transition-colors duration-150 hover:text-foreground hover:underline"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-foreground">
              Hostels
            </li>
          </ol>
        </nav>

        <h1 className="text-h1 text-balance text-foreground">
          Find your room near campus
        </h1>
        <p className="mt-3 text-base text-pretty text-muted-foreground">
          Every listing here is reviewed before it goes live. Filter by budget,
          facilities and how close it sits to your university, then message the
          owner yourself, with no agent in between.
        </p>

        <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-success" aria-hidden="true" />
            Admin-verified listings
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4 text-accent-500" aria-hidden="true" />
            Real photos &amp; real reviews
          </li>
          <li className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-brand-600" aria-hidden="true" />
            Distances measured to campus
          </li>
        </ul>
      </header>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] xl:gap-10">
        <FilterSidebar filters={filters} facets={facets} className="hidden lg:block" />

        <div className="min-w-0">
          {/* ── Results toolbar ── */}
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <h2 className="tabular text-h3 text-foreground">{summary}</h2>
              <p className="tabular mt-1 text-sm text-muted-foreground">
                {total > 0
                  ? `Showing ${from}–${to} · page ${Math.min(filters.page, pages)} of ${pages}`
                  : 'Try widening your budget or removing a filter'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <MobileFilterSheet filters={filters} facets={facets} className="lg:hidden" />
              <Button
                href={`/map${buildQuery(filters, { page: 1, view: 'grid' })}`}
                variant="secondary"
                size="md"
                className="hidden sm:inline-flex"
              >
                <MapIcon className="size-4" aria-hidden="true" />
                Map
              </Button>
              <SortSelect filters={filters} className="w-[11.5rem]" />
              <ViewToggle filters={filters} />
            </div>
          </div>

          {/* ── Active filter chips ── */}
          <div className="mt-4 empty:mt-0">
            <ActiveFilters filters={filters} />
          </div>

          {/* ── Results ── */}
          <div className="mt-6">
            {rows.length > 0 ? (
              <ul
                className={
                  filters.view === 'list'
                    ? 'grid grid-cols-1 gap-4'
                    : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'
                }
              >
                {rows.map((hostel, i) => (
                  <li key={hostel._id} className="min-w-0">
                    {/* The first row is above the fold on every breakpoint. */}
                    <HostelCard hostel={hostel} priority={i < 3} showSave />
                  </li>
                ))}
              </ul>
            ) : total > 0 ? (
              <EmptyState
                icon={SearchX}
                title="Nothing on this page"
                description={`There ${total === 1 ? 'is' : 'are'} ${total} matching ${total === 1 ? 'hostel' : 'hostels'}, but page ${filters.page} is past the end of the list.`}
                action={
                  <Button href={hostelsHref(filters, { page: 1 })} variant="primary">
                    Back to page 1
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="No hostels match those filters"
                description="Nothing in the directory fits every constraint at once. Loosening the budget or dropping a facility usually brings results straight back."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      href={hostelsHref(DEFAULT_FILTERS, {
                        sort: filters.sort,
                        view: filters.view,
                      })}
                      variant="primary"
                    >
                      Clear filters
                    </Button>
                    {filters.q && (
                      <Button href={hostelsHref(filters, { q: '', page: 1 })} variant="secondary">
                        Keep filters, drop the search
                      </Button>
                    )}
                  </div>
                }
              />
            )}
          </div>

          <Paginator filters={filters} pages={pages} className="mt-10" />
        </div>
      </div>
    </div>
  );
}
