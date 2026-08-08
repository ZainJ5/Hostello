'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, MessageSquare, Star, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Field';
import { Alert, Avatar, EmptyState, Rating, Spinner } from '@/components/ui/Feedback';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import { Modal, ConfirmDialog } from './Modal';
import { useToast } from './Toast';
import { apiSend } from './api-client';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unreplied', label: 'Needs a reply' },
  { key: 'replied', label: 'Replied' },
  { key: 'flagged', label: 'Reported' },
];

const SUB_SCORES = [
  ['cleanliness', 'Cleanliness'],
  ['food', 'Food'],
  ['security', 'Security'],
  ['location', 'Location'],
  ['valueForMoney', 'Value'],
];

function ReplyBox({ review, onDone }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(review.ownerReply || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save() {
    setBusy(true);
    setError('');
    try {
      await apiSend(`/api/owner/reviews/${review._id}/reply`, { body: { reply: value.trim() } });
      toast.success('Your reply is now public under this review.');
      setOpen(false);
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(err.fieldErrors?.reply || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeReply() {
    try {
      await apiSend(`/api/owner/reviews/${review._id}/reply`, { method: 'DELETE' });
      toast.success('Reply removed.');
      setValue('');
      router.refresh();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  }

  if (review.ownerReply && !open) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface-sunken p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <MessageSquare className="size-3.5" aria-hidden="true" />
            Your public reply
            <span className="font-normal text-muted-foreground">
              · {timeAgo(review.ownerRepliedAt)}
            </span>
          </p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRemoving(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-foreground text-pretty">{review.ownerReply}</p>

        <ConfirmDialog
          open={removing}
          onClose={() => setRemoving(false)}
          onConfirm={removeReply}
          title="Remove your reply?"
          confirmLabel="Remove reply"
        >
          Students will no longer see your response to this review. The review itself stays.
        </ConfirmDialog>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        <MessageSquare className="size-4" aria-hidden="true" />
        Reply publicly
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border p-3">
      <Textarea
        label="Your public reply"
        hint="Everyone browsing this listing sees it. Thank them, answer the criticism, keep it short."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={1000}
        error={error}
        autoFocus
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpen(false);
            setValue(review.ownerReply || '');
            setError('');
          }}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={save} loading={busy} disabled={!value.trim()}>
          Publish reply
        </Button>
      </div>
    </div>
  );
}

function ReportDialog({ review, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const router = useRouter();

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await apiSend(`/api/owner/reviews/${review._id}/report`, { body: { reason: reason.trim() } });
      toast.success('Reported. A moderator will look at it.');
      onClose();
      router.refresh();
    } catch (err) {
      setError(err.fieldErrors?.reason || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title="Report this review"
      description="Use this for reviews that are fake, abusive, or about a different hostel."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={!reason.trim()}>
            <Flag className="size-4" aria-hidden="true" />
            Report for moderation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert tone="warning" title="Reporting does not hide the review">
          It stays public and keeps counting toward your rating. A moderator decides whether it
          breaks the rules — a low rating on its own is not grounds for removal.
        </Alert>
        <Textarea
          label="What is wrong with it?"
          hint="Be specific. “This student never stayed here — no booking under that name” is actionable; “unfair” is not."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          error={error}
          autoFocus
        />
      </div>
    </Modal>
  );
}

export default function ReviewsBoard({ reviews, hostels, counts, average, breakdown, filters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reporting, setReporting] = useState(null);

  function navigate(next) {
    const params = new URLSearchParams();
    const filter = next.filter ?? filters.filter;
    const hostelId = next.hostelId ?? filters.hostelId;
    if (filter && filter !== 'all') params.set('filter', filter);
    if (hostelId && hostelId !== 'all') params.set('hostelId', hostelId);
    const query = params.toString();
    startTransition(() => router.push(`/owner/reviews${query ? `?${query}` : ''}`));
  }

  const maxBar = Math.max(1, ...breakdown.map((b) => b.count));

  return (
    <>
      <div className="mb-4 grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
        <Card className="p-5">
          <p className="text-sm font-medium text-muted-foreground">Across all your listings</p>
          <p className="tabular mt-2 text-4xl font-bold tracking-tight text-foreground">
            {average ? average.toFixed(1) : '—'}
          </p>
          <Rating value={average} size="sm" showValue={false} className="mt-1" />
          <p className="tabular mt-1 text-xs text-muted-foreground">
            {counts.all} review{counts.all === 1 ? '' : 's'}
          </p>

          <ul className="mt-4 space-y-1.5">
            {breakdown.map((row) => (
              <li key={row.star} className="flex items-center gap-2 text-xs">
                <span className="tabular flex w-8 shrink-0 items-center gap-0.5 text-muted-foreground">
                  {row.star}
                  <Star className="size-3 fill-current text-accent-400" aria-hidden="true" />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-accent-400"
                    style={{ width: `${(row.count / maxBar) * 100}%` }}
                  />
                </span>
                <span className="tabular w-8 text-right text-muted-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-3">
          <nav
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            aria-label="Filter reviews"
          >
            {TABS.map((tab) => {
              const active = filters.filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => navigate({ filter: tab.key })}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium',
                    'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active
                      ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                      : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground'
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                      active ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {counts[tab.key] || 0}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {pending && <Spinner className="size-4 text-muted-foreground" />}
            <label className="sr-only" htmlFor="review-listing-filter">
              Filter by listing
            </label>
            <select
              id="review-listing-filter"
              value={filters.hostelId || 'all'}
              onChange={(e) => navigate({ hostelId: e.target.value })}
              className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none sm:max-w-xs"
            >
              <option value="all">All listings</option>
              {hostels.map((hostel) => (
                <option key={hostel._id} value={hostel._id}>
                  {hostel.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title={counts.all === 0 ? 'No reviews yet' : 'Nothing matches this filter'}
          description={
            counts.all === 0
              ? 'Students can review a hostel after they stay. Confirmed bookings are the fastest route to your first review.'
              : 'Try another filter to see the rest of your reviews.'
          }
          action={
            counts.all === 0 ? (
              <Button href="/owner/bookings" variant="secondary">
                View booking requests
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate({ filter: 'all', hostelId: 'all' })}>
                Show all reviews
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review._id} id={`review-${review._id}`} className="scroll-mt-24">
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-3">
                  <Avatar name={review.studentName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {review.studentName || 'Anonymous student'}
                      </p>
                      {review.status !== 'published' && (
                        <StatusBadge status={review.status} size="sm" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {review.hostelName} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <Rating value={review.rating} size="sm" />
                </div>

                {review.title && (
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{review.title}</h3>
                )}
                <p className="mt-1 text-sm text-muted-foreground text-pretty">{review.comment}</p>

                {SUB_SCORES.some(([key]) => review[key]) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SUB_SCORES.filter(([key]) => review[key]).map(([key, label]) => (
                      <Badge key={key} tone="neutral" size="sm">
                        <span className="tabular">
                          {label} {review[key]}/5
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}

                <ReplyBox review={review} />

                <div className="mt-3 flex justify-end border-t border-border pt-3">
                  {review.status === 'flagged' ? (
                    <p className="text-xs text-warning dark:text-amber-300">
                      Reported — waiting on a moderator.
                    </p>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setReporting(review)}>
                      <Flag className="size-4" aria-hidden="true" />
                      Report
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {reporting && <ReportDialog review={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}
