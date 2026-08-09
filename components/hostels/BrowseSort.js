'use client';

import SortSelect from '@/components/ds/SortSelect';
import { hostelsHref } from './filters';
import { SORT_OPTIONS } from './browse-copy';

/**
 * A client side wrapper around the design system's sort control.
 *
 * WHY IT EXISTS. `components/ds/SortSelect` is a client component and takes an
 * `hrefFor` function. A function cannot cross the server to client boundary,
 * so rendering it straight from the browse page compiles and works in dev and
 * then throws "Functions cannot be passed directly to Client Components" on
 * every request in a production build. Passing the filter object instead, and
 * building the hrefs on the client where the component already runs, keeps the
 * page server rendered and leaves the primitive untouched.
 *
 * This is worth fixing centrally: a control in the shared set should not have
 * an API that only a client component can call. Flagged in the handover.
 */
export default function BrowseSort({ filters, className }) {
  return (
    <SortSelect
      value={filters.sort}
      options={SORT_OPTIONS}
      hrefFor={(sort) => hostelsHref(filters, { sort, page: 1 })}
      className={className}
    />
  );
}
