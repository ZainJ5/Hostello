'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Figma input/sort 74:117.
 *
 * Recommended is the default, because that is what the live site does, and
 * the menu names what recommended means by sitting beside sorts that are all
 * mechanical.
 *
 * Five states rather than seven: pressed is indistinguishable from open on a
 * select, and loading does not apply to a control whose options are already
 * on the page.
 *
 * Built on a native select. The design draws a custom menu carrying the one
 * shadow in the system, but a native select gives correct keyboard handling,
 * a real listbox for screen readers and the platform picker on a phone. The
 * closed control matches the frame exactly; the open menu is the platform's.
 * That trade is recorded in IMPLEMENTATION_NOTES.md.
 */
export default function SortSelect({ value, options, hrefFor, className }) {
  const router = useRouter();

  return (
    <div
      className={cn(
        'inline-flex rounded-ds-slot',
        'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt',
        className
      )}
      style={{ padding: 'var(--ds-focus-gap)' }}
    >
      <div
        className={cn(
          'relative flex min-w-px flex-1 items-center gap-2 overflow-hidden px-3',
          'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised',
          'hover:border-ds-cobalt focus-within:border-ds-ink'
        )}
        style={{ height: 'var(--ds-control-h)' }}
      >
        <label htmlFor="sort" className="ds-body-s shrink-0 text-ds-ink-muted">
          Sort
        </label>
        <select
          id="sort"
          value={value}
          onChange={(e) => router.push(hrefFor(e.target.value))}
          className="ds-body-m-strong min-w-px flex-1 cursor-pointer appearance-none bg-transparent text-ds-ink focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 7"
          className="size-3 shrink-0 text-ds-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M1 1l5 5 5-5" />
        </svg>
      </div>
    </div>
  );
}
