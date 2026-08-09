import Link from 'next/link';
import { cn, formatDate, initials, timeAgo } from '@/lib/utils';

/**
 * One review, from the reviews frame 94:5045.
 *
 * A review is published under a first name and a surname initial, which is
 * what the privacy policy promises, so the avatar is those initials rather
 * than a photograph. There is no photograph to show and a generated one would
 * be a face that does not exist.
 *
 * THE OWNER REPLY CAN NEVER BE A DELETION. An owner replies once, inside the
 * review, indented under it, and the review itself is untouched above it. The
 * reply is visibly subordinate on purpose: the last word on a review belongs
 * to the student who wrote it.
 *
 * `showHostel` turns the card into the version used on the site wide reviews
 * page, where the reader needs to know which hostel is being talked about.
 */
export default function ReviewCard({ review, showHostel = false, className }) {
  const hostel = review?.hostelId && typeof review.hostelId === 'object' ? review.hostelId : null;
  const name = review?.studentName?.trim() || 'A student';
  const when = review?.createdAt;

  return (
    <article className={cn('ds-elevated flex flex-col gap-3 rounded-ds-inner p-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-px items-center gap-3">
          <span
            aria-hidden="true"
            className="ds-body-s-strong grid size-10 shrink-0 place-items-center rounded-ds-inner bg-ds-surface-sunken text-ds-ink"
          >
            {initials(name)}
          </span>

          <div className="flex min-w-px flex-col">
            <p className="ds-body-m-strong text-ds-ink">{name}</p>
            {showHostel && hostel?.slug ? (
              <p className="ds-body-s text-ds-ink-muted">
                <Link
                  href={`/hostels/${hostel.slug}`}
                  className="rounded-ds-chip text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                >
                  {hostel.name}
                </Link>
                {hostel.city ? `, ${hostel.city}` : ''}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <p className="ds-figure-l text-ds-ink">
            <span aria-hidden="true">{Number(review?.rating || 0).toFixed(1)}</span>
            <span className="sr-only">{review?.rating} out of 5</span>
          </p>
          {when ? (
            <time dateTime={new Date(when).toISOString()} className="ds-mono-meta text-ds-ink-muted">
              {timeAgo(when)}
            </time>
          ) : null}
        </div>
      </div>

      {review?.title ? <p className="ds-body-m-strong text-ds-ink">{review.title}</p> : null}

      <p className="ds-body-m whitespace-pre-line text-pretty text-ds-ink">{review?.comment}</p>

      {review?.ownerReply ? (
        <div className="flex flex-col gap-1 border-l-2 border-solid border-ds-hairline bg-ds-surface-sunken py-3 pl-4 pr-3">
          <p className="ds-body-s-strong text-ds-ink">Reply from the owner</p>
          <p className="ds-body-s whitespace-pre-line text-pretty text-ds-ink-muted">
            {review.ownerReply}
          </p>
          <p className="ds-mono-meta text-ds-ink-muted">
            An owner can reply once and cannot remove the review
            {review.ownerRepliedAt ? `. ${formatDate(review.ownerRepliedAt)}` : ''}
          </p>
        </div>
      ) : null}
    </article>
  );
}
