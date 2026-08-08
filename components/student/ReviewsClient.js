'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  MessageSquareText,
  Pencil,
  SquarePen,
  Star,
  Trash2,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { EmptyState, Rating } from '@/components/ui/Feedback';
import HostelImage from '@/components/ui/HostelImage';
import { formatDate, timeAgo } from '@/lib/utils';
import { REVIEW_SUBSCORES } from './constants';
import Drawer from './Drawer';
import ReviewForm from './ReviewForm';
import { useToast } from './Toast';

/**
 * Reviews the student has written, plus the hostels they are entitled to
 * review but haven't. The eligibility list is computed on the server from
 * `confirmed`/`completed` bookings, so this shelf can never offer a hostel the
 * API would then refuse.
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
      toast({ tone: 'success', title: 'Review updated', description: 'Thanks for keeping it current.' });
    } else {
      setReviews((list) => [{ ...saved, hostelId: hostel }, ...list]);
      setPending((list) => list.filter((h) => String(h._id) !== String(hostel?._id)));
      toast({
        tone: 'success',
        title: 'Review published',
        description: 'It is live on the listing now — thank you.',
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

      // It becomes reviewable again — the booking that earned it still stands.
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
        title: 'Could not delete',
        description: err.message || 'Please try again in a moment.',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section aria-labelledby="reviewable-heading">
          <div className="mb-4">
            <h2 id="reviewable-heading" className="text-h3 text-foreground">
              Hostels you can review
            </h2>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              You stayed, or the owner confirmed you — your review carries real weight.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pending.map((hostel) => (
              <li key={String(hostel._id)}>
                <Card className="flex items-center gap-4 p-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                    <HostelImage
                      src={hostel.images?.[0]}
                      name={hostel.name}
                      alt={hostel.name}
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/hostels/${hostel.slug}`}
                      className="block cursor-pointer truncate text-sm font-semibold text-foreground transition-colors duration-200 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand-400"
                    >
                      {hostel.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {[hostel.area, hostel.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <Button
                    variant="accent"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setWritingFor(hostel)}
                  >
                    <SquarePen className="size-4" aria-hidden="true" />
                    Write review
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="my-reviews-heading">
        <div className="mb-4">
          <h2 id="my-reviews-heading" className="text-h3 text-foreground">
            Your reviews
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reviews.length
              ? `${reviews.length} review${reviews.length === 1 ? '' : 's'} written.`
              : 'Nothing written yet.'}
          </p>
        </div>

        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="You haven't written a review yet"
            description={
              pending.length > 0
                ? 'You have a hostel waiting above — a few honest lines take two minutes and help every student after you.'
                : 'Once a hostel confirms your booking, you can share what the stay was really like.'
            }
            action={
              <Button href="/hostels" variant="primary">
                <Compass className="size-4" aria-hidden="true" />
                Browse hostels
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
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
      {writingFor && (
        <ReviewForm
          key={`write-${writingFor._id}`}
          open
          hostel={writingFor}
          onClose={() => setWritingFor(null)}
          onSaved={handleSaved}
        />
      )}

      {editing && (
        <ReviewForm
          key={`edit-${editing._id}`}
          open
          review={editing}
          hostel={editing.hostelId}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      <Drawer
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Delete this review?"
        description="It will be removed from the listing and the hostel's rating recalculated."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => confirmDelete && remove(confirmDelete)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete review
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground text-pretty">
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
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
            <HostelImage
              src={hostel?.images?.[0]}
              name={hostel?.name}
              alt={hostel?.name || 'Hostel'}
              sizes="48px"
            />
          </div>
          <div className="min-w-0">
            {hostel?.slug ? (
              <Link
                href={`/hostels/${hostel.slug}`}
                className="block cursor-pointer truncate font-semibold text-foreground transition-colors duration-200 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand-400"
              >
                {hostel.name}
              </Link>
            ) : (
              <p className="font-semibold text-foreground">Listing removed</p>
            )}
            <p className="truncate text-xs text-muted-foreground">
              Reviewed {formatDate(review.createdAt)}
              {review.updatedAt && review.updatedAt !== review.createdAt
                ? ` · edited ${timeAgo(review.updatedAt)}`
                : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {review.status !== 'published' && <StatusBadge status={review.status} />}
          <Rating value={review.rating} size="sm" />
        </div>
      </div>

      {review.title && (
        <p className="mt-3 font-semibold text-foreground text-pretty">{review.title}</p>
      )}
      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">{review.comment}</p>

      {subs.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {subs.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="tabular font-semibold text-foreground">{review[s.key]}/5</dd>
            </div>
          ))}
        </dl>
      )}

      {review.ownerReply && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3.5 dark:border-brand-900 dark:bg-brand-950/50">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-900 dark:text-brand-200">
            <MessageSquareText className="size-3.5" aria-hidden="true" />
            Reply from {hostel?.name || 'the owner'}
            {review.ownerRepliedAt && (
              <span className="font-normal text-brand-800/70 dark:text-brand-300/70">
                {timeAgo(review.ownerRepliedAt)}
              </span>
            )}
          </p>
          <p className="mt-1.5 text-sm text-brand-900 text-pretty dark:text-brand-100">
            {review.ownerReply}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </Card>
  );
}
