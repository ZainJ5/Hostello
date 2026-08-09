import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Figma nav/breadcrumbs. One 18 tall row of body/s, links in cobalt and the
 * current page in ink, separated by a hairline slash.
 *
 * Every item except the last is a real link, so the trail doubles as the way
 * back up the directory: a student who landed on a listing from Google can
 * walk out to the city and then to the whole catalogue.
 *
 * `items` is `[{ href, label }]`; the final item is rendered as the current
 * page and its href is ignored.
 */
export default function Breadcrumbs({ items = [], className }) {
  const trail = items.filter(Boolean);
  if (!trail.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('w-full', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${item.href || 'current'}-${item.label}`} className="flex items-center gap-2">
              {last || !item.href ? (
                <span aria-current={last ? 'page' : undefined} className="ds-body-s text-ds-ink">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="ds-body-s text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                >
                  {item.label}
                </Link>
              )}
              {last ? null : (
                <span aria-hidden="true" className="ds-body-s text-ds-ink-muted">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
