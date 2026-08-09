'use client';

import SortSelect from '@/components/ds/SortSelect';
import { buildLandingQuery } from './catalog';

/**
 * A client shim around the design system's sort control.
 *
 * `components/ds/SortSelect` is a Client Component and takes `hrefFor` as a
 * function, which a Server Component cannot hand across the boundary. The
 * landing templates render entirely on the server, so the href builder is
 * reconstructed here from plain serialisable state instead.
 *
 * Nothing about the control changes. This exists only to move the closure to
 * the client side of the line, and it is deliberately the whole of the
 * client-side JavaScript on these three routes.
 */
export default function LandingSort({
  basePath,
  filters,
  options,
  locked,
  defaultSort,
  className,
}) {
  const opts = { locked, defaultSort };

  return (
    <SortSelect
      value={filters.sort}
      options={options}
      hrefFor={(value) => `${basePath}${buildLandingQuery(filters, { sort: value, page: 1 }, opts)}`}
      className={className}
    />
  );
}
