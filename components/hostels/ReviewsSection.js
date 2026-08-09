import Link from 'next/link';
import Review from '@/models/Review';
import { EmptyState } from '@/components/ds/Feedback';
import { cn, initials, timeAgo } from '@/lib/utils';

export const REVIEWS_PER_PAGE = 6;

/**
 * Figma section/reviews 85:2222.
 *
 * WHAT THE DATA ACTUALLY HOLDS. 62 of 124 listings carry a rating and a review
 * count that came from Hostello's earlier site, and the `Review` collection is
 * empty. So a listing can honestly show 4.9 from 138 students and have nothing
 * for you to read. The design has no state for that, and inventing review text
 * to fill the frame is exactly the thing this project refuses to do, so the
 * aggregate is shown with a line saying where it came from and why the
 * write-ups are not underneath it.
 *
 * The score is never dressed up with stars. A row of glyphs reads as texture
 * at this size; the number reads as data.
 */

/** Summary and one page of published reviews, in a single round trip each. */
export async function loadReviews(hostelId, page = 1) {
  const [summaryRaw] = await Review.aggregate([
    { $match: { hostelId, status: 'published' } },
    {
      $facet: {
        averages: [{ $group: { _id: null, total: { $sum: 1 }, overall: { $avg: '$rating' } } }],
      },
    },
  ]);

  const averages = summaryRaw?.averages?.[0] || { total: 0, overall: 0 };
  const total = averages.total || 0;
  const pages = Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), pages);

  const items = total
    ? await Review.find({ hostelId, status: 'published' })
        .sort({ createdAt: -1, _id: -1 })
        .skip((safePage - 1) * REVIEWS_PER_PAGE)
        .limit(REVIEWS_PER_PAGE)
        .select('studentName rating title comment ownerReply ownerRepliedAt createdAt')
        .lean()
    : [];

  return { total, pages, page: safePage, overall: Number(averages.overall) || 0, items };
}

function Avatar({ name }) {
  return (
    <span
      aria-hidden="true"
      className="ds-body-s-strong grid size-9 shrink-0 place-items-center rounded-ds-chip bg-ds-surface-sunken text-ds-ink"
    >
      {initials(name)}
    </span>
  );
}

export default function ReviewsSection({ slug, hostel, reviews, className }) {
  const { total, pages, page, overall, items } = reviews;

  const legacyScore = Number(hostel?.rating) || 0;
  const legacyCount = Number(hostel?.reviewCount) || 0;

  // Nothing written and nothing inherited.
  if (!total && !legacyCount) {
    return (
      <div id="reviews" className={className}>
        <EmptyState
          title="No reviews yet"
          body="Nobody has reviewed this hostel on Hostello. If you have lived here, yours would be the first thing the next student reads."
        />
      </div>
    );
  }

  // Inherited figures with nothing to read under them.
  if (!total) {
    return (
      <div id="reviews" className={cn('flex w-full flex-col gap-2', className)}>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="ds-figure-l text-ds-ink">{legacyScore.toFixed(1)}</p>
          <p className="ds-body-s min-w-px flex-1 text-ds-ink-muted">
            from {legacyCount} {legacyCount === 1 ? 'student' : 'students'}
          </p>
        </div>
        <p className="ds-body-s max-w-[80ch] text-ds-ink-muted">
          That score is an aggregate carried over from Hostello&apos;s earlier site. The
          individual write-ups behind it were not carried over, so there is nothing to read
          here yet. Reviews written from now on appear in full, with the owner able to reply
          once and unable to delete.
        </p>
      </div>
    );
  }

  return (
    <div id="reviews" className={cn('flex w-full flex-col gap-4', className)}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="ds-figure-l text-ds-ink">{overall.toFixed(1)}</p>
        <p className="ds-body-s min-w-px flex-1 text-ds-ink-muted">
          from {total} {total === 1 ? 'student who' : 'students who'} had an account when they
          wrote it. Owners can reply and cannot delete.
        </p>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {items.map((r) => (
          <li key={String(r._id)} className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4">
            <div className="flex items-start gap-3">
              <Avatar name={r.studentName || 'Student'} />
              <div className="min-w-px flex-1">
                <p className="ds-body-m-strong truncate text-ds-ink">
                  {r.studentName || 'Hostello student'}
                </p>
                <p className="ds-body-s text-ds-ink-muted">
                  Rated {Number(r.rating).toFixed(1)} out of 5
                </p>
              </div>
              <time
                dateTime={new Date(r.createdAt).toISOString()}
                className="ds-mono-meta shrink-0 text-ds-ink-muted"
              >
                {timeAgo(r.createdAt)}
              </time>
            </div>

            {r.title ? <p className="ds-body-m-strong text-ds-ink">{r.title}</p> : null}
            <p className="ds-body-s text-pretty text-ds-ink-muted">{r.comment}</p>

            {r.ownerReply ? (
              <div className="flex flex-col gap-1 rounded-ds-inner bg-ds-surface-sunken p-3.5">
                <p className="ds-label text-ds-ink-muted">Reply from the owner</p>
                <p className="ds-body-s text-pretty text-ds-ink">{r.ownerReply}</p>
                <p className="ds-body-s text-ds-ink-muted">
                  An owner can reply once and cannot remove the review.
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {pages > 1 ? (
        <nav
          aria-label="Review pages"
          className="flex items-center justify-between gap-3 border-t border-solid border-ds-hairline pt-4"
        >
          <PageLink slug={slug} page={page - 1} disabled={page === 1} label="Newer reviews" rel="prev" />
          <p className="ds-mono-meta text-ds-ink-muted">
            Page {page} of {pages}
          </p>
          <PageLink slug={slug} page={page + 1} disabled={page === pages} label="Older reviews" rel="next" />
        </nav>
      ) : null}
    </div>
  );
}

function PageLink({ slug, page, disabled, label, rel }) {
  const face =
    'ds-body-s ds-tap inline-flex items-center justify-center rounded-ds-chip border border-solid px-3.5';

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(face, 'cursor-not-allowed border-ds-hairline bg-ds-surface-raised text-ds-ink-muted')}
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={`/hostels/${slug}${page > 1 ? `?reviews=${page}` : ''}#reviews`}
      rel={rel}
      className={cn(
        face,
        'border-ds-control bg-ds-surface-raised text-ds-ink hover:border-ds-cobalt',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
      )}
    >
      {label}
    </Link>
  );
}
