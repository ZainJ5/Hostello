import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Figma card/post 47:48. The one shape shared by an answered question, an open
 * question and a notice on the board.
 *
 * Geometry read from the file: p12, gap 8, radius 4, a hairline border and the
 * raised surface. Elevation is that border and never a shadow, so a list of
 * these reads as a stack of documents rather than a feed of floating cards.
 * That is the whole reason the shape is shared: a question somebody answered
 * eight months ago and a rickshaw leaving in forty minutes are both notices on
 * a wall, and the only thing separating them is the line of type in the
 * footer.
 *
 * THE TYPE TAG IS NOT badge/status. It looks similar and it is a different
 * component: mono/meta rather than body/s strong, px8 py3 rather than px10
 * py6. Reusing the status badge here would have been slightly wrong in type
 * and would have quietly claimed that a post type is a verification state, so
 * it is drawn from the same tokens instead.
 *
 * The detail line is `color/ink`, not muted. Only the footer is muted. On a
 * board where the detail line carries the price, the seat count and the
 * pickup point, muting it would push the only useful facts on the card into
 * the quietest colour on the page.
 *
 * The footer is always author on the left, truncating, and time on the right,
 * never truncating. "expires 1 Oct" losing its date is worse than a long name
 * losing its tail.
 */
export default function PostCard({
  tag,
  title,
  href,
  body,
  meta,
  time,
  actions,
  children,
  className,
}) {
  return (
    <article className={cn('ds-elevated flex flex-col gap-2 rounded-ds-inner p-3', className)}>
      {tag ? (
        <div className="flex">
          <span className="ds-mono-meta inline-flex items-center rounded-ds-chip border border-solid border-ds-ink bg-ds-surface-raised px-2 py-1 text-ds-ink">
            {tag}
          </span>
        </div>
      ) : null}

      {title ? (
        <h3 className="ds-body-m-strong w-full text-balance text-ds-ink">
          {href ? (
            <Link href={href} className="ds-focusable underline-offset-2 hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
      ) : null}

      {body ? <p className="ds-body-s w-full text-pretty text-ds-ink">{body}</p> : null}

      {children}

      {meta || time ? (
        <div className="flex w-full items-baseline gap-3">
          <span className="ds-mono-meta min-w-px flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-ds-ink-muted">
            {meta}
          </span>
          {time ? (
            <span className="ds-mono-meta shrink-0 text-ds-ink-muted">{time}</span>
          ) : null}
        </div>
      ) : null}

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </article>
  );
}
