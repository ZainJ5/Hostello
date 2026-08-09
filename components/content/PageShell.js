import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * The single column every read once page uses: about, safety, terms, privacy,
 * list your hostel, report a listing and write a review.
 *
 * Every one of those frames in Figma centres the same column, so the shell is
 * one component rather than eight copies of the same wrapper. The measured
 * column is 760 at 1440, which is 47.5rem, and it collapses to the full width
 * minus the page gutter below that. Nothing here is a fixed pixel value: the
 * column is a rem measure and the gutter is a spacing step.
 */

const linkClass =
  'rounded-ds-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt';

/**
 * `trail` is an array of { href, label }. The last entry is the current page
 * and never renders as a link, so a screen reader is not offered a link to
 * where it already is.
 */
export function Breadcrumb({ trail }) {
  if (!Array.isArray(trail) || trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="ds-body-s flex flex-wrap items-center gap-x-2 gap-y-1 text-ds-ink-muted">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-x-2">
              {i > 0 ? (
                <span aria-hidden="true" className="text-ds-ink-muted">
                  /
                </span>
              ) : null}
              {last || !crumb.href ? (
                <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className={cn('text-ds-cobalt', linkClass)}>
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default function ContentPage({ trail, title, intro, meta, children, className }) {
  return (
    <div className={cn('mx-auto w-full max-w-[47.5rem] px-4 pb-20 pt-8 sm:pt-12', className)}>
      <Breadcrumb trail={trail} />

      <h1 className="ds-display-xl mt-5 text-balance text-ds-ink">{title}</h1>

      {intro ? <p className="ds-body-l mt-4 text-pretty text-ds-ink">{intro}</p> : null}
      {meta ? <p className="ds-body-s mt-3 text-ds-ink-muted">{meta}</p> : null}

      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </div>
  );
}
