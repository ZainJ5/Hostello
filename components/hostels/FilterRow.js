import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * One row of the filter rail. Figma filter-row inside page/browse-hostels
 * 77:923: a 44 tall row carrying a 20 square indicator, the label in body/m
 * and the count in mono.
 *
 * Every row is a link, not a checkbox, so the whole rail works before
 * hydration, every filter combination has a real URL, and the back button
 * walks the filter history. The link carries `aria-pressed` because it
 * behaves as a toggle rather than as navigation to a new resource.
 *
 * A count of zero disables the row instead of hiding it. A row that vanishes
 * as you tick things cannot tell you what your filters cost you, and the note
 * at the foot of the rail says so in words.
 */
export default function FilterRow({ href, label, count, selected = false, disabled = false }) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-ds-chip border border-solid',
          selected
            ? 'border-ds-ink bg-ds-ink'
            : disabled
              ? 'border-ds-hairline bg-ds-surface-sunken'
              : 'border-ds-control bg-ds-surface-raised'
        )}
      >
        {selected ? (
          <svg viewBox="0 0 12 10" className="size-3 text-ds-on-ink" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 5l3.5 3.5L11 1.5" />
          </svg>
        ) : null}
      </span>

      <span
        className={cn(
          'ds-body-m min-w-px flex-1 truncate',
          disabled ? 'text-ds-ink-muted' : 'text-ds-ink'
        )}
      >
        {label}
      </span>

      {typeof count === 'number' ? (
        <span className="ds-mono-meta shrink-0 text-ds-ink-muted">{count}</span>
      ) : null}
    </>
  );

  const face = cn(
    'flex w-full items-center gap-2.5 rounded-ds-inner px-1',
    'transition-colors duration-150 motion-reduce:transition-none',
    'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ds-cobalt'
  );

  const style = { minHeight: 'var(--ds-control-h)' };

  if (disabled || !href) {
    return (
      <li>
        <span aria-disabled="true" className={cn(face, 'cursor-not-allowed')} style={style}>
          {body}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-pressed={selected}
        className={cn(face, 'hover:bg-ds-surface-sunken')}
        style={style}
      >
        {body}
      </Link>
    </li>
  );
}
