'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import FilterPanel from './FilterPanel';
import { DEFAULT_FILTERS, activeFilterCount, buildQuery, hostelsHref } from './filters';

/**
 * Desktop filter rail. Every edit rewrites the URL, so results stay shareable
 * and the browser's back button walks the filter history. Text and slider
 * edits are debounced by the panel's `meta.debounce` hint; checkbox and
 * segmented-control edits navigate on the next tick.
 */
export default function FilterSidebar({ filters, facets, className }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(filters);
  const timer = useRef(null);
  // Mirrors `draft` so `apply` can read the latest value without re-creating
  // itself, and without scheduling the navigation inside a state updater —
  // updaters must stay pure or StrictMode's double-invoke leaks a timer.
  const draftRef = useRef(filters);

  const urlKey = buildQuery(filters);
  const draftKey = buildQuery(draft);

  // Adopt the server's state when the URL moved without us — back/forward, a
  // removed chip, "Clear all" — but never while an edit is still settling.
  useEffect(() => {
    if (isPending || timer.current) return;
    if (draftKey !== urlKey) {
      draftRef.current = filters;
      setDraft(filters);
    }
    // `filters`/`draftKey` are intentionally excluded: this must run on URL
    // identity, not on every re-render of a fresh object literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey, isPending]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = useCallback(
    (patch, meta = {}) => {
      // Any filter change invalidates the current page offset.
      const next = { ...draftRef.current, ...patch, page: 1 };
      draftRef.current = next;
      setDraft(next);

      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        startTransition(() => router.push(hostelsHref(next), { scroll: false }));
      }, meta.debounce ?? 0);
    },
    [router]
  );

  const count = activeFilterCount(draft);

  return (
    <aside
      aria-label="Filter hostels"
      className={cn('w-full', className)}
      aria-busy={isPending || undefined}
    >
      <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[var(--radius-panel)] border border-border bg-surface p-5 pb-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 pb-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="size-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            Filters
            {count > 0 && (
              <span className="tabular grid size-5 place-items-center rounded-full bg-brand-700 text-[11px] font-semibold text-white">
                {count}
              </span>
            )}
          </h2>
          {count > 0 && (
            <button
              type="button"
              onClick={() => {
                clearTimeout(timer.current);
                timer.current = null;
                // Clearing keeps sort order and layout — only constraints go.
                const cleared = { ...DEFAULT_FILTERS, sort: filters.sort, view: filters.view };
                draftRef.current = cleared;
                setDraft(cleared);
                startTransition(() => router.push(hostelsHref(cleared), { scroll: false }));
              }}
              className="h-11 cursor-pointer rounded-lg px-2 text-sm font-medium text-brand-700 transition-colors duration-150 hover:text-brand-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300"
            >
              Clear all
            </button>
          )}
        </div>

        <div
          className={cn(
            'transition-opacity duration-200',
            isPending && 'pointer-events-none opacity-60'
          )}
        >
          <FilterPanel value={draft} facets={facets} onChange={apply} />
        </div>
      </div>
    </aside>
  );
}
