import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The trail every community page opens with. The last item is the page you are
 * on and is never a link, so the row cannot be used to reload the same page.
 *
 * Kept local to the community routes rather than added to `components/ds`,
 * because a shared primitive is a central decision and this work does not get
 * to make one on its own.
 */
export default function Breadcrumbs({ trail, className }) {
  const items = (trail || []).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {last || !item.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className="ds-body-s text-ds-ink-muted"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'ds-body-s ds-focusable text-ds-cobalt underline-offset-2 hover:underline'
                  )}
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
