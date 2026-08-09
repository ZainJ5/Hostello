import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The filter panel on the landing templates. Every row is a link, so the whole
 * panel works with JavaScript off, every combination has a real URL, and a
 * crawler can walk sideways from one search to the next. That is the reason
 * these three routes exist at all, so a client component here would be the
 * wrong instinct.
 *
 * Rows that name another landing page navigate to it rather than adding a
 * query parameter: from Islamabad, Rawalpindi is a different page, not a
 * filter. Rows inside the page's own dimensions toggle a parameter.
 *
 * A row scoring zero is disabled in place rather than removed, so the panel
 * shows what a filter costs instead of silently shrinking.
 */

function Box({ selected, disabled }) {
  return (
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
    />
  );
}

function Row({ row }) {
  const { label, count, href, selected, disabled, current } = row;

  const body = (
    <>
      <Box selected={selected} disabled={disabled} />
      <span className={cn('ds-body-m min-w-px flex-1', disabled ? 'text-ds-ink-muted' : 'text-ds-ink')}>
        {label}
      </span>
      {typeof count === 'number' ? (
        <span className="ds-body-s shrink-0 tabular-nums text-ds-ink-muted">{count}</span>
      ) : null}
    </>
  );

  const shape = 'ds-tap flex w-full items-center gap-3 rounded-ds-inner py-1.5';

  if (disabled || !href) {
    return (
      <li>
        <span
          aria-disabled={disabled ? 'true' : undefined}
          aria-current={current ? 'page' : undefined}
          className={cn(shape, disabled && 'cursor-not-allowed')}
        >
          {body}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        aria-pressed={selected}
        className={cn(
          shape,
          'transition-colors duration-150 motion-reduce:transition-none',
          'hover:text-ds-cobalt',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
        )}
      >
        {body}
      </Link>
    </li>
  );
}

export default function FacetPanel({ groups, clearHref, addedCount = 0, className }) {
  return (
    <div className={cn('ds-elevated flex w-full flex-col gap-5 rounded-ds-inner p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="ds-body-m-strong text-ds-ink">Filters</p>
        {addedCount > 0 && clearHref ? (
          <Link
            href={clearHref}
            className="ds-body-s text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Clear {addedCount}
          </Link>
        ) : null}
      </div>

      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="ds-body-s-strong pb-1 text-ds-ink">{group.title}</p>
          <ul className="flex flex-col">
            {group.rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
          </ul>
        </div>
      ))}

      <p className="ds-body-s text-ds-ink-muted">
        Counts update as you filter. A count of zero disables the row rather than hiding it, so you
        can see what your filters cost you.
      </p>
    </div>
  );
}
