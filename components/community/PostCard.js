import Link from 'next/link';
import Badge from '@/components/ds/Badge';
import { cn } from '@/lib/utils';

/**
 * card/post 47:48. The one shape shared by an answered question, an open
 * question and a notice on the board.
 *
 * Elevation is a hairline border, never a shadow, so a list of these reads as
 * a stack of documents rather than a feed of floating cards. That is the whole
 * reason the shape is shared: a question somebody answered eight months ago
 * and a rickshaw leaving in forty minutes are both notices on a wall, and the
 * only thing separating them is the line of type in the footer.
 *
 * The footer is always author on the left and time on the right. On a phone it
 * wraps rather than truncating, because "expires 1 Oct" losing its date is
 * worse than a second line.
 *
 * The type tag uses the hollow status badge. Hollow is the system's neutral
 * tier and the frame draws the tag as an outline box, so the tag inherits the
 * grammar instead of introducing a sixth kind of pill.
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
    <article className={cn('ds-elevated flex flex-col gap-2 rounded-ds-inner p-4', className)}>
      {tag ? (
        <div className="flex">
          <Badge variant="outline">{tag}</Badge>
        </div>
      ) : null}

      {title ? (
        <h3 className="ds-body-m-strong text-balance text-ds-ink">
          {href ? (
            <Link href={href} className="ds-focusable underline-offset-2 hover:underline">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
      ) : null}

      {body ? <p className="ds-body-m max-w-[75ch] text-pretty text-ds-ink-muted">{body}</p> : null}

      {children}

      {meta || time ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-1">
          <span className="ds-mono-meta text-ds-ink-muted">{meta}</span>
          {time ? <span className="ds-mono-meta text-ds-ink-muted">{time}</span> : null}
        </div>
      ) : null}

      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
    </article>
  );
}
