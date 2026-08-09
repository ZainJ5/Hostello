'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ds/Badge';
import Button from '@/components/ds/Button';
import { EmptyState } from '@/components/ds/Feedback';
import { formatDate, timeAgo } from '@/lib/utils';
import { REVIEW_SUBSCORES } from './constants';
import Drawer from './Drawer';
import ReviewForm from './ReviewForm';
import { useToast } from './Toast';

/**
 * Reviews the student has written, plus the hostels they are entitled to
 * review but have not.
 *
 * The eligibility list is computed on the server from confirmed or completed
 * enquiries, so this shelf can never offer a hostel the API would then refuse.
 * On a fresh database both lists are empty, which is why each one has a real
 * empty state and neither renders a count that could only ever read zero.
 *
 * The design file has no frame for this route. It is built in the same shell
 * as the four that do have frames.
 */
export default function ReviewsClient({ reviews: initial, reviewable }) {
  const router = useRouter();
  const { toast } = useToast();
  const [reviews, setReviews] = useState(initial);
  const [pending, setPending] = useState(reviewable);
  const [editing, setEditing] = useState(null); // review being edited
  const [writingFor, setWritingFor] = useState(null); // hostel being reviewed
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  function handleSaved(saved, { editing: wasEditing, hostel }) {
    if (wasEditing) {
      setReviews((list) =>
        list.map((r) => (r._id === saved._id ? { ...r, ...saved, hostelId: r.hostelId } : r))
      );
      toast({
        tone: 'success',
        title: 'Review updated',
        description: 'Thanks for keeping it current.',
      });
    } else {
      setReviews((list) => [{ ...saved, hostelId: hostel }, ...list]);
      setPending((list) => list.filter((h) => String(h._id) !== String(hostel?._id)));
      toast({
        tone: 'success',
        title: 'Review published',
        description: 'It is live on the listing now. Thank you.',
      });
    }
    startTransition(() => router.refresh());
  }

  async function remove(review) {
    setDeleting(true);
    const before = reviews;
    setReviews((list) => list.filter((r) => r._id !== review._id)); // optimistic

    try {
      const res = await fetch(`/api/reviews/${review._id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete that review');

      // It becomes reviewable again, because the enquiry that earned it stands.
      if (review.hostelId?._id) {
        setPending((list) =>
          list.some((h) => String(h._id) === String(review.hostelId._id))
            ? list
            : [review.hostelId, ...list]
        );
      }
      setConfirmDelete(null);
      toast({
        tone: 'success',
        title: 'Review deleted',
        description: 'The hostel rating has been recalculated.',
      });
      startTransition(() => router.refresh());
    } catch (err) {
      setReviews(before); // rollback
      toast({
        tone: 'danger',
        title: 'Could not delete it',
        description: err.message || 'Please try again in a moment.',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {pending.length > 0 ? (
        <section aria-labelledby="reviewable-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="reviewable-heading" className="ds-display-m text-ds-ink">
              Hostels you can review
            </h2>
            <p className="ds-body-s text-pretty text-ds-ink-muted">
              You stayed, or the owner confirmed you, so your review carries real weight.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {pending.map((hostel) => (
              <li
                key={String(hostel._id)}
                className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/hostels/${hostel.slug}`}
                    className="ds-body-m-strong block truncate text-ds-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
                  >
                    {hostel.name}
                  </Link>
                  <p className="ds-body-s truncate text-ds-ink-muted">
                    {[hostel.area, hostel.city].filter(Boolean).join(', ')}
                  </p>
                </div>
                <Button className="shrink-0" onClick={() => setWritingFor(hostel)}>
                  Write a review
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="my-reviews-heading" className="flex flex-col gap-4">
        <h2 id="my-reviews-heading" className="ds-display-m text-ds-ink">
          Your reviews
        </h2>

        {reviews.length === 0 ? (
          <EmptyState
            title="You have not written a review yet"
            body={
              pending.length > 0
                ? 'There is a hostel waiting above. A few honest lines take two minutes and help every student who looks at that listing after you.'
                : 'Once an owner confirms one of your enquiries, you can say what the place was actually like. Only students the owner confirmed can review a hostel, and that is what makes these worth reading.'
            }
            action={<Button href="/hostels">Browse hostels</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((review) => (
              <li key={review._id}>
                <ReviewRow
                  review={review}
                  onEdit={() => setEditing(review)}
                  onDelete={() => setConfirmDelete(review)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mounted only while open and keyed by target, so each visit starts
          from the props rather than from whatever was typed last time. */}
      {writingFor ? (
        <ReviewForm
          key={`write-${writingFor._id}`}
          open
          hostel={writingFor}
          onClose={() => setWritingFor(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {editing ? (
        <ReviewForm
          key={`edit-${editing._id}`}
          open
          review={editing}
          hostel={editing.hostelId}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      ) : null}

      <Drawer
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Delete this review?"
        description="It comes off the listing and the hostel's rating is recalculated."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Keep it
            </Button>
            <Button
              loading={deleting}
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              Delete it
            </Button>
          </div>
        }
      >
        <p className="ds-body-m text-pretty text-ds-ink-muted">
          This cannot be undone, though you can write a new review for{' '}
          {confirmDelete?.hostelId?.name || 'the hostel'} afterwards.
        </p>
      </Drawer>
    </div>
  );
}

function ReviewRow({ review, onEdit, onDelete }) {
  const hostel = review.hostelId;
  const subs = REVIEW_SUBSCORES.filter((s) => review[s.key] != null);

  return (
    <article className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="ds-display-s text-ds-ink">
            {hostel?.slug ? (
              <Link
                href={`/hostels/${hostel.slug}`}
                className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                {hostel.name}
              </Link>
            ) : (
              'Listing removed'
            )}
          </h3>
          <p className="ds-body-s text-ds-ink-muted">
            Reviewed {formatDate(review.createdAt)}
            {review.updatedAt && review.updatedAt !== review.createdAt
              ? `, edited ${timeAgo(review.updatedAt)}`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {review.status !== 'published' ? (
            <Badge variant="outline">{review.status}</Badge>
          ) : null}
          <p className="ds-figure-l text-ds-ink">
            {review.rating}
            <span className="ds-body-s text-ds-ink-muted"> of 5</span>
          </p>
        </div>
      </div>

      {review.title ? (
        <p className="ds-body-m-strong text-pretty text-ds-ink">{review.title}</p>
      ) : null}
      <p className="ds-body-m text-pretty text-ds-ink-muted">{review.comment}</p>

      {subs.length > 0 ? (
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
          {subs.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <dt className="ds-body-s text-ds-ink-muted">{s.label}</dt>
              <dd className="ds-mono-meta text-ds-ink">{review[s.key]}/5</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {review.ownerReply ? (
        <div className="rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-sunken p-4">
          <p className="ds-body-s-strong text-ds-ink">
            Reply from {hostel?.name || 'the owner'}
            {review.ownerRepliedAt ? (
              <span className="ds-body-s text-ds-ink-muted"> {timeAgo(review.ownerRepliedAt)}</span>
            ) : null}
          </p>
          <p className="ds-body-m mt-1.5 text-pretty text-ds-ink">{review.ownerReply}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="secondary" onClick={onEdit} className="sm:flex-1">
          Edit
        </Button>
        <Button variant="secondary" onClick={onDelete} className="sm:flex-1">
          Delete
        </Button>
      </div>
    </article>
  );
}
