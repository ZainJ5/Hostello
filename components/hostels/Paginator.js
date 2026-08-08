import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hostelsHref } from './filters';

/**
 * Builds the classic 1 … 4 5 6 … 12 window: always the first and last page,
 * always a neighbour either side of the current one, ellipses for the gaps.
 */
function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => ({ page: i + 1, key: i + 1 }));

  const set = new Set([1, pages, page, page - 1, page + 1]);
  // Keep the strip a constant width at the ends so it doesn't jump about.
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));

  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) out.push({ gap: true, key: `gap-${n}` });
    out.push({ page: n, key: n });
    prev = n;
  }
  return out;
}

const CELL =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-medium ' +
  'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default function Paginator({ filters, pages, className }) {
  if (pages <= 1) return null;

  const page = Math.min(Math.max(1, filters.page), pages);
  const items = pageWindow(page, pages);

  return (
    <nav aria-label="Search results pages" className={cn('flex justify-center', className)}>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={hostelsHref(filters, { page: page - 1 })}
              rel="prev"
              className={cn(CELL, 'cursor-pointer border border-border bg-surface text-foreground hover:bg-muted')}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sr-only sm:hidden">Previous page</span>
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(CELL, 'border border-border text-muted-foreground/50')}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </span>
          )}
        </li>

        {items.map((item) =>
          item.gap ? (
            <li key={item.key} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item.key}>
              <Link
                href={hostelsHref(filters, { page: item.page })}
                aria-current={item.page === page ? 'page' : undefined}
                aria-label={`Page ${item.page}${item.page === page ? ', current page' : ''}`}
                className={cn(
                  CELL,
                  'tabular cursor-pointer',
                  item.page === page
                    ? 'bg-brand-700 text-white shadow-brand hover:bg-brand-800'
                    : 'border border-border bg-surface text-foreground hover:bg-muted'
                )}
              >
                {item.page}
              </Link>
            </li>
          )
        )}

        <li>
          {page < pages ? (
            <Link
              href={hostelsHref(filters, { page: page + 1 })}
              rel="next"
              className={cn(CELL, 'cursor-pointer border border-border bg-surface text-foreground hover:bg-muted')}
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sr-only sm:hidden">Next page</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span aria-disabled="true" className={cn(CELL, 'border border-border text-muted-foreground/50')}>
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
