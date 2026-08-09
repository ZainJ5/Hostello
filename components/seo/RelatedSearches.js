import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The sideways moves out of this page.
 *
 * A student who lands here from Google has one search in mind, and the fastest
 * route to the right listing is the next narrower search rather than a return
 * to a blank filter panel. Each chip carries its own count, so nobody is sent
 * to an empty page, and a chip that would score zero is never rendered.
 *
 * Chip geometry is the filter chip's: a 3px transparent slot carrying the
 * focus ring around a 38 tall chip, so the row never reflows on focus. The
 * label is cobalt rather than ink because these navigate, and cobalt is what
 * interaction means everywhere else in the system.
 */
export default function RelatedSearches({ items, className }) {
  const rows = (items || []).filter((i) => i && i.href && (i.count === undefined || i.count > 0));
  if (!rows.length) return null;

  return (
    <section className={cn('flex flex-col gap-4', className)} aria-labelledby="related-heading">
      <h2 id="related-heading" className="ds-display-s text-ds-ink">
        Related searches
      </h2>

      <ul className="flex flex-wrap items-center gap-1">
        {rows.map((item) => (
          <li key={item.href + item.label}>
            <span
              className="inline-flex rounded-ds-chip-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt"
              style={{ padding: 'var(--ds-focus-gap)' }}
            >
              <Link
                href={item.href}
                style={{ height: 'var(--ds-chip-h)' }}
                className={cn(
                  'ds-body-s inline-flex items-center justify-center gap-2 rounded-ds-chip px-3',
                  'border border-solid border-ds-hairline bg-ds-surface-raised text-ds-cobalt',
                  'transition-colors duration-150 motion-reduce:transition-none',
                  'hover:border-ds-cobalt focus:outline-none'
                )}
              >
                <span>{item.label}</span>
                {typeof item.count === 'number' ? (
                  <span className="ds-mono-meta text-ds-ink-muted">
                    {item.count} {item.count === 1 ? 'hostel' : 'hostels'}
                  </span>
                ) : null}
              </Link>
            </span>
          </li>
        ))}
      </ul>

      <p className="ds-body-s max-w-[95ch] text-ds-ink-muted">
        These links are the point of this page. A student who lands here from Google has one search
        in mind, and the fastest way to the right listing is a sideways move to the next narrower
        search rather than back to a blank filter panel.
      </p>
    </section>
  );
}
