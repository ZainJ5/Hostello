import Link from 'next/link';
import { X } from 'lucide-react';
import { DEFAULT_FILTERS, hostelsHref, toChips } from './filters';

/**
 * Removable chips for whatever is currently narrowing the grid. Rendered on
 * the server as plain links: each chip is the URL minus that one constraint,
 * so they work before hydration and are keyboard reachable by default.
 */
export default function ActiveFilters({ filters }) {
  const chips = toChips(filters);
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Active filters</span>

      {chips.map((chip) => (
        <Link
          key={chip.id}
          href={hostelsHref(filters, { ...chip.patch, page: 1 })}
          scroll={false}
          aria-label={`Remove ${chip.group} filter: ${chip.label}`}
          className="group inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface pl-3 pr-2 text-sm text-foreground shadow-xs transition-colors duration-200 hover:border-border-strong hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="text-muted-foreground">{chip.group}:</span>
          <span className="max-w-[14rem] truncate font-medium">{chip.label}</span>
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full bg-muted text-muted-foreground transition-colors duration-150 group-hover:bg-danger-soft group-hover:text-danger dark:group-hover:bg-danger/20"
          >
            <X className="size-3" />
          </span>
        </Link>
      ))}

      {/* Clearing keeps reading preferences (sort order, grid vs list) and
          drops only the constraints. */}
      <Link
        href={hostelsHref(DEFAULT_FILTERS, { sort: filters.sort, view: filters.view })}
        scroll={false}
        className="inline-flex h-11 cursor-pointer items-center rounded-full px-3 text-sm font-semibold text-brand-700 underline-offset-4 transition-colors duration-200 hover:bg-brand-50 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:bg-brand-950"
      >
        Clear all
      </Link>
    </div>
  );
}
