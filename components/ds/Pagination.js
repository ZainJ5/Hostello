import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Figma nav/pagination 78:55.
 *
 * PAGINATION, NOT INFINITE SCROLL. The directory lives on Google. Infinite
 * scroll puts listings 13 to 124 behind a scroll event, so they have no URL,
 * no crawlable link and no way to be shared or bookmarked. Numbered pages
 * give every result set a real URL.
 *
 * It also fixes what infinite scroll breaks on a phone: tap a hostel, read
 * it, hit back, and you land where you were rather than at result one.
 *
 * Previous stays visible and disabled on page one, so the control does not
 * move between pages.
 *
 * Mobile drops the numbers, because eleven pills do not fit at 390, and keeps
 * Previous, a plain count and Next.
 */

const CELL =
  'ds-body-s inline-flex items-center justify-center rounded-ds-chip border border-solid';

function Cell({ children, href, tone = 'idle', label, wide = false }) {
  const style = { height: 'var(--ds-control-h)', minWidth: 'var(--ds-control-h)' };

  const face = cn(
    CELL,
    wide ? 'px-3.5' : 'px-3',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt',
    tone === 'current' && 'bg-ds-ink border-ds-control text-ds-on-ink',
    tone === 'idle' && 'bg-ds-surface-raised border-ds-control text-ds-ink hover:border-ds-cobalt',
    tone === 'muted' && 'bg-ds-surface-raised border-ds-hairline text-ds-ink-muted',
    tone === 'disabled' && 'bg-ds-surface-raised border-ds-hairline text-ds-ink-muted cursor-not-allowed'
  );

  if (!href || tone === 'disabled' || tone === 'muted') {
    return (
      <span className={face} style={style} aria-disabled={tone === 'disabled' || undefined}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={face} style={style} aria-label={label} aria-current={tone === 'current' ? 'page' : undefined}>
      {children}
    </Link>
  );
}

/** Windowed page list: 1 to 4, an ellipsis, then the last page. */
function windowed(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pages - 1, page + 1);
  if (from > 2) out.push('gap-start');
  for (let i = from; i <= to; i += 1) out.push(i);
  if (to < pages - 1) out.push('gap-end');
  out.push(pages);
  return out;
}

export default function Pagination({ page, pages, total, perPage, hrefFor, className }) {
  if (!pages || pages < 2) return null;

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);
  const summary = `Showing ${first} to ${last} of ${total} ${total === 1 ? 'hostel' : 'hostels'}`;

  return (
    <nav aria-label="Results pages" className={cn('flex flex-col items-center gap-2.5', className)}>
      {/* Mobile: Previous, count, Next */}
      <div className="flex w-full items-center gap-2 sm:hidden">
        <Cell href={page > 1 ? hrefFor(page - 1) : null} tone={page > 1 ? 'idle' : 'disabled'} label="Previous page" wide>
          Previous
        </Cell>
        <p className="ds-body-s min-w-px flex-1 text-center text-ds-ink">
          Page {page} of {pages}
        </p>
        <Cell href={page < pages ? hrefFor(page + 1) : null} tone={page < pages ? 'idle' : 'disabled'} label="Next page" wide>
          Next
        </Cell>
      </div>

      {/* Desktop: numbered pages */}
      <div className="hidden items-center gap-1.5 sm:flex">
        <Cell href={page > 1 ? hrefFor(page - 1) : null} tone={page > 1 ? 'idle' : 'disabled'} label="Previous page">
          Previous
        </Cell>
        {windowed(page, pages).map((p) =>
          typeof p === 'number' ? (
            <Cell key={p} href={hrefFor(p)} tone={p === page ? 'current' : 'idle'} label={`Page ${p}`}>
              {p}
            </Cell>
          ) : (
            <Cell key={p} tone="muted">
              ...
            </Cell>
          )
        )}
        <Cell href={page < pages ? hrefFor(page + 1) : null} tone={page < pages ? 'idle' : 'disabled'} label="Next page">
          Next
        </Cell>
      </div>

      <p className="ds-body-s text-center text-ds-ink-muted sm:whitespace-nowrap">{summary}</p>
    </nav>
  );
}
