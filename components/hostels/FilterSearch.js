'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { hostelsHref } from './filters';

/**
 * ADDITION, NOT IN THE FIGMA RAIL. The browse frame has no text field: it
 * assumes you arrive already filtered, from the home page or from one of the
 * campus and city landing pages. Free text search is a working feature of the
 * live site, and without a field here a student who lands on /hostels cannot
 * search by hostel name at all, so the control stays.
 *
 * It is drawn on input/sort 74:117 geometry so it belongs to the rail rather
 * than looking imported: a transparent 3px slot carrying the focus ring, a 44
 * tall control inside it, and the same hairline to cobalt to ink keyline
 * progression as every other control in the system.
 *
 * Navigation is debounced and pushed with `scroll: false`, so typing does not
 * yank the page back to the top between keystrokes.
 */
export default function FilterSearch({ filters, className }) {
  const router = useRouter();
  const [value, setValue] = useState(filters.q || '');
  const [isPending, startTransition] = useTransition();
  const timer = useRef(null);
  const urlQ = filters.q || '';

  // Adopt the URL when it moves without us: back, forward, or "Clear all".
  useEffect(() => {
    if (timer.current) return;
    setValue(urlQ);
  }, [urlQ]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function edit(next) {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      startTransition(() => router.push(hostelsHref(filters, { q: next, page: 1 }), { scroll: false }));
    }, 300);
  }

  return (
    <div
      className={cn(
        'flex w-full rounded-ds-slot',
        'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt',
        className
      )}
      style={{ padding: 'var(--ds-focus-gap)' }}
      aria-busy={isPending || undefined}
    >
      <div
        className={cn(
          'flex min-w-px flex-1 items-center gap-2 overflow-hidden rounded-ds-inner px-3',
          'border border-solid border-ds-control bg-ds-surface-raised',
          'hover:border-ds-cobalt focus-within:border-ds-ink'
        )}
        style={{ height: 'var(--ds-control-h)' }}
      >
        <label htmlFor="browse-q" className="sr-only">
          Search hostels by name or area
        </label>
        <input
          id="browse-q"
          type="search"
          value={value}
          onChange={(e) => edit(e.target.value)}
          placeholder="Name, area or sector"
          className="ds-body-m min-w-px flex-1 bg-transparent text-ds-ink placeholder:text-ds-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => edit('')}
            className="ds-body-s-strong shrink-0 cursor-pointer rounded-ds-chip px-1 text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
