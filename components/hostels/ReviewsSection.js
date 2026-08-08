import Link from 'next/link';
import { ChevronLeft, ChevronRight, CornerDownRight, MessageSquare, Star } from 'lucide-react';
import Review from '@/models/Review';
import { Avatar, EmptyState, Rating } from '@/components/ui/Feedback';
import Button from '@/components/ui/Button';
import { cn, timeAgo } from '@/lib/utils';

export const REVIEWS_PER_PAGE = 6;

const SUBSCORES = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'food', label: 'Food' },
  { key: 'security', label: 'Security' },
  { key: 'location', label: 'Location' },
  { key: 'valueForMoney', label: 'Value for money' },
];

/**
 * Loads the review summary and one page of published reviews.
 *
 * The distribution, the five sub-score averages and the row count all come out
 * of a single `$facet` aggregation, so the summary block costs one round trip
 * regardless of how many reviews a listing has accumulated.
 */
export async function loadReviews(hostelId, page = 1) {
  const [summaryRaw] = await Review.aggregate([
    { $match: { hostelId, status: 'published' } },
    {
      $facet: {
        distribution: [{ $group: { _id: '$rating', count: { $sum: 1 } } }],
        averages: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              overall: { $avg: '$rating' },
              cleanliness: { $avg: '$cleanliness' },
              food: { $avg: '$food' },
              security: { $avg: '$security' },
              location: { $avg: '$location' },
              valueForMoney: { $avg: '$valueForMoney' },
            },
          },
        ],
      },
    },
  ]);

  const averages = summaryRaw?.averages?.[0] || { total: 0, overall: 0 };
  const total = averages.total || 0;
  const pages = Math.max(1, Math.ceil(total / REVIEWS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), pages);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: summaryRaw?.distribution?.find((d) => d._id === star)?.count || 0,
  }));

  const items = total
    ? await Review.find({ hostelId, status: 'published' })
        .sort({ createdAt: -1, _id: -1 })
        .skip((safePage - 1) * REVIEWS_PER_PAGE)
        .limit(REVIEWS_PER_PAGE)
        .select('studentName rating title comment ownerReply ownerRepliedAt createdAt')
        .lean()
    : [];

  return { total, pages, page: safePage, averages, distribution, items };
}

function ScoreBar({ label, value }) {
  const v = Number(value) || 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-brand-600 transition-[width] duration-500"
          style={{ width: `${(v / 5) * 100}%` }}
        />
      </span>
      <span className="tabular w-9 shrink-0 text-right text-sm font-semibold text-foreground">
        {v.toFixed(1)}
      </span>
    </div>
  );
}

export default function ReviewsSection({ slug, reviews, className }) {
  const { total, pages, page, averages, distribution, items } = reviews;

  if (!total) {
    return (
      <div className={className} id="reviews">
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Nobody has reviewed this hostel on Hostello. If you've lived here, your write-up would be the first thing the next student reads."
          action={
            <Button href={`/hostels/${slug}/book`} variant="secondary">
              Request a room
            </Button>
          }
        />
      </div>
    );
  }

  const overall = Number(averages.overall) || 0;
  const subs = SUBSCORES.filter((s) => Number(averages[s.key]) > 0);

  return (
    <div className={className} id="reviews">
      {/* ── Summary ── */}
      <div className="grid gap-8 rounded-[var(--radius-panel)] border border-border bg-surface-sunken p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:justify-center">
          <p className="tabular font-display text-5xl font-extrabold leading-none tracking-tight text-foreground">
            {overall.toFixed(1)}
          </p>
          <div>
            <Rating value={overall} size="md" showValue={false} />
            <p className="tabular mt-1 text-sm text-muted-foreground">
              {total} review{total === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {distribution.map(({ star, count }) => {
            const pct = total ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="tabular inline-flex w-9 shrink-0 items-center gap-0.5 text-sm text-muted-foreground">
                  {star}
                  <Star className="size-3 fill-current text-accent-400" aria-hidden="true" />
                </span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-accent-400"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="tabular w-8 shrink-0 text-right text-sm text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
          <p className="sr-only">
            {distribution
              .map(({ star, count }) => `${count} ${star}-star review${count === 1 ? '' : 's'}`)
              .join(', ')}
          </p>
        </div>

        {subs.length > 0 && (
          <div className="space-y-2.5">
            {subs.map((s) => (
              <ScoreBar key={s.key} label={s.label} value={averages[s.key]} />
            ))}
          </div>
        )}
      </div>

      {/* ── Review list ── */}
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <li
            key={String(r._id)}
            className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5"
          >
            <div className="flex items-start gap-3">
              <Avatar name={r.studentName || 'Student'} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {r.studentName || 'Hostello student'}
                </p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={new Date(r.createdAt).toISOString()}>{timeAgo(r.createdAt)}</time>
                </p>
              </div>
              <Rating value={r.rating} size="sm" showValue={false} className="shrink-0" />
            </div>

            {r.title && (
              <p className="mt-3.5 text-sm font-semibold text-pretty text-foreground">{r.title}</p>
            )}
            <p className={cn('text-sm leading-relaxed text-pretty text-muted-foreground', r.title ? 'mt-1' : 'mt-3.5')}>
              {r.comment}
            </p>

            {r.ownerReply && (
              <div className="mt-4 rounded-xl border border-border bg-surface-sunken p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-800 dark:text-brand-300">
                  <CornerDownRight className="size-3.5" aria-hidden="true" />
                  Reply from the owner
                  {r.ownerRepliedAt && (
                    <span className="font-normal text-muted-foreground">
                      · {timeAgo(r.ownerRepliedAt)}
                    </span>
                  )}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
                  {r.ownerReply}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav
          aria-label="Review pages"
          className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5"
        >
          <ReviewPageLink slug={slug} page={page - 1} disabled={page === 1} direction="prev" />
          <p className="tabular text-sm text-muted-foreground">
            Page {page} of {pages}
          </p>
          <ReviewPageLink slug={slug} page={page + 1} disabled={page === pages} direction="next" />
        </nav>
      )}
    </div>
  );
}

function ReviewPageLink({ slug, page, disabled, direction }) {
  const label = direction === 'prev' ? 'Newer reviews' : 'Older reviews';
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const classes =
    'inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors duration-200';

  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(classes, 'text-muted-foreground/50')}>
        {direction === 'prev' && <Icon className="size-4" aria-hidden="true" />}
        {label}
        {direction === 'next' && <Icon className="size-4" aria-hidden="true" />}
      </span>
    );
  }

  return (
    <Link
      href={`/hostels/${slug}${page > 1 ? `?reviews=${page}` : ''}#reviews`}
      rel={direction}
      className={cn(classes, 'cursor-pointer bg-surface text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring')}
    >
      {direction === 'prev' && <Icon className="size-4" aria-hidden="true" />}
      {label}
      {direction === 'next' && <Icon className="size-4" aria-hidden="true" />}
    </Link>
  );
}
