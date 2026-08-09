import { EmptyState } from '@/components/ds/Feedback';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import ReviewCard from './ReviewCard';

/**
 * A list of reviews, or the empty state.
 *
 * THE EMPTY STATE IS THE REAL ONE. The Review collection holds nothing, so
 * this renders on day one everywhere it is used. It is not a zero, it is not a
 * skeleton left up forever, and it is never filled with sample reviews. It
 * says why there is nothing here and what would put something here.
 *
 * The caller passes `legacyRating` when the listing carries a score from
 * before Hostello collected reviews on it. That is the honest half of the
 * awkward case: 62 listings show a number with nothing to list. The empty
 * state names it rather than letting the score and the blank list contradict
 * each other silently.
 */
export default function ReviewList({
  reviews,
  showHostel = false,
  emptyTitle,
  emptyBody,
  emptyAction,
  className,
}) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return (
      <EmptyState
        title={emptyTitle || 'No reviews yet'}
        body={
          emptyBody ||
          'Nobody has written one here yet. Reviews come from students who enquired and stayed, so the first one appears when somebody who lived here writes it.'
        }
        action={emptyAction}
        className={className}
      />
    );
  }

  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {reviews.map((review) => (
        <li key={review._id}>
          <ReviewCard review={review} showHostel={showHostel} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The note a listing needs when it carries a legacy score and no reviews. Kept
 * beside the list so the two can never drift apart.
 */
export function LegacyRatingNote({ rating, count, className }) {
  const score = Number(rating) || 0;
  if (score < 1) return null;

  return (
    <p className={cn('ds-body-s text-pretty text-ds-ink-muted', className)}>
      This listing carries a score of {score.toFixed(1)}
      {Number(count) > 0 ? ` from ${count} ratings` : ''} collected before Hostello started keeping
      reviews on the site. There is nothing to read behind it yet, which is why it is written here
      rather than shown as a review score.
    </p>
  );
}

/** The call to action under an empty list, when the reader could write the first one. */
export function WriteFirstReview({ slug }) {
  if (!slug) return null;
  return <Button href={`/hostels/${slug}/review`}>Write the first review</Button>;
}
