'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Flag, MessageSquare, Star, Trash2, Undo2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { Avatar, EmptyState, Rating } from '@/components/ui/Feedback';
import {
  FilterBar,
  FilterSelect,
  Pagination,
  PendingOverlay,
  ResetFilters,
  SearchBox,
  useAdminQuery,
} from '@/components/admin/Filters';
import {
  Table,
  TableWrap,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/admin/Table';
import { ConfirmDialog } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { REVIEW_STATUS_OPTIONS } from '@/components/admin/labels';
import { cn, timeAgo } from '@/lib/utils';

const SUB_SCORES = [
  ['cleanliness', 'Cleanliness'],
  ['food', 'Food'],
  ['security', 'Security'],
  ['location', 'Location'],
  ['valueForMoney', 'Value'],
];

export default function ReviewsTable({ rows, total, page, pages, perPage, hostels, stats }) {
  const router = useRouter();
  const toast = useToast();
  const { get, set, reset, pending } = useAdminQuery();

  const [busy, setBusy] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtersActive = ['q', 'status', 'hostel', 'rating'].some((k) => get(k));

  function toggleExpanded(id) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  async function act(row, action, title) {
    setBusy(`${row._id}-${action}`);
    const res = await apiSend(`/api/admin/reviews/${row._id}`, {
      method: 'PATCH',
      body: { action },
    });
    setBusy(null);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not update', description: res.error });
    toast({
      title,
      description: `${row.hostel?.name || 'Listing'} now shows ${res.data.rating} from ${res.data.reviewCount} reviews.`,
    });
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await apiSend(`/api/admin/reviews/${deleteTarget._id}`, { method: 'DELETE' });
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not delete', description: res.error });
    setDeleteTarget(null);
    toast({ tone: 'info', title: 'Review deleted', description: 'The listing rating was recalculated.' });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {REVIEW_STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={get('status') === s.value}
            onClick={() => set({ status: get('status') === s.value ? '' : s.value })}
            className={cn(
              'flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border px-4 py-3 text-left transition-colors duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              get('status') === s.value
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/50'
                : 'border-border bg-surface hover:bg-muted/60'
            )}
          >
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              {s.value === 'flagged' && <Flag className="size-3.5 text-warning" aria-hidden="true" />}
              {s.label}
            </span>
            <span className="tabular text-sm font-semibold text-foreground">
              {(stats[s.value] || 0).toLocaleString('en-PK')}
            </span>
          </button>
        ))}
      </div>

      <FilterBar>
        <SearchBox
          value={get('q')}
          onSearch={(v) => set({ q: v })}
          placeholder="Search title, comment or student…"
        />
        <FilterSelect
          label="Status"
          value={get('status')}
          onChange={(v) => set({ status: v })}
          options={REVIEW_STATUS_OPTIONS}
          allLabel="Any status"
        />
        <FilterSelect
          label="Rating"
          value={get('rating')}
          onChange={(v) => set({ rating: v })}
          options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))}
          allLabel="Any rating"
        />
        <FilterSelect
          label="Listing"
          value={get('hostel')}
          onChange={(v) => set({ hostel: v })}
          options={hostels}
          allLabel="All listings"
          className="max-w-56"
        />
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      <PendingOverlay pending={pending}>
        {rows.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={filtersActive ? 'No reviews match those filters' : 'No reviews yet'}
            description={
              filtersActive
                ? 'Reset the filters to see the whole moderation queue.'
                : 'Student reviews land here for moderation as soon as they are written.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={reset}>
                  Reset filters
                </Button>
              ) : (
                <Button href="/admin/listings" variant="secondary" size="sm">
                  Browse listings
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table minWidth="min-w-[68rem]">
                <THead>
                  <tr>
                    <Th>Review</Th>
                    <Th>Listing</Th>
                    <Th align="right">Rating</Th>
                    <Th align="right">Flags</Th>
                    <Th>Status</Th>
                    <Th align="right">Posted</Th>
                    <Th align="right" width="17rem">
                      <span className="sr-only">Moderate</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => {
                    const isOpen = expanded.has(row._id);
                    return (
                      <Tr key={row._id}>
                        <Td className="max-w-md">
                          <div className="flex items-start gap-2.5">
                            <Avatar name={row.studentName} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {row.title || row.studentName || 'Review'}
                              </p>
                              <p
                                className={cn(
                                  'text-xs text-muted-foreground text-pretty',
                                  !isOpen && 'line-clamp-2'
                                )}
                              >
                                {row.comment}
                              </p>
                              {isOpen && (
                                <ul className="mt-2 flex flex-wrap gap-1.5">
                                  {SUB_SCORES.filter(([k]) => row[k]).map(([k, label]) => (
                                    <li key={k}>
                                      <Badge tone="neutral" size="sm" className="tabular">
                                        {label} {row[k]}
                                        <Star className="size-2.5" aria-hidden="true" />
                                      </Badge>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {isOpen && row.ownerReply && (
                                <p className="mt-2 rounded-lg border-l-2 border-brand-600 bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">Owner replied:</span>{' '}
                                  {row.ownerReply}
                                </p>
                              )}
                              {(row.comment?.length > 110 || row.ownerReply) && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(row._id)}
                                  className="mt-1 cursor-pointer text-xs font-medium text-brand-700 underline hover:no-underline dark:text-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                >
                                  {isOpen ? 'Show less' : 'Read full review'}
                                </button>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          {row.hostel ? (
                            <Link
                              href={`/admin/listings/${row.hostel._id}/edit`}
                              className="block max-w-44 truncate text-sm text-foreground transition-colors duration-150 hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                            >
                              {row.hostel.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">Deleted listing</span>
                          )}
                        </Td>
                        <Td align="right">
                          <Rating value={row.rating} size="sm" />
                        </Td>
                        <Td align="right">
                          {row.flagCount > 0 ? (
                            <Badge tone="warning" size="sm" className="tabular">
                              <Flag className="size-3" aria-hidden="true" />
                              {row.flagCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </Td>
                        <Td>
                          <StatusBadge status={row.status} size="sm" />
                        </Td>
                        <Td align="right" className="whitespace-nowrap text-xs text-muted-foreground">
                          {timeAgo(row.createdAt)}
                        </Td>
                        <Td align="right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.status === 'removed' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={busy === `${row._id}-restore`}
                                onClick={() => act(row, 'restore', 'Review restored')}
                              >
                                <Undo2 className="size-3.5" aria-hidden="true" />
                                Restore
                              </Button>
                            ) : (
                              <>
                                {row.status === 'flagged' && (
                                  <Button
                                    size="sm"
                                    loading={busy === `${row._id}-approve`}
                                    onClick={() => act(row, 'approve', 'Review kept')}
                                  >
                                    <Check className="size-3.5" aria-hidden="true" />
                                    Keep
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  loading={busy === `${row._id}-remove`}
                                  onClick={() => act(row, 'remove', 'Review removed')}
                                >
                                  Remove
                                </Button>
                              </>
                            )}
                            <button
                              type="button"
                              aria-label={`Delete the review by ${row.studentName || 'this student'}`}
                              onClick={() => setDeleteTarget(row)}
                              className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-danger-soft hover:text-danger dark:hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>

            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onPage={(n) => set({ page: n }, { keepPage: true })}
              label="reviews"
            />
          </>
        )}
      </PendingOverlay>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this review permanently?"
        description="Removing hides it and keeps the record. Deleting destroys it."
        confirmLabel="Delete review"
        confirmPhrase="DELETE"
      >
        <p className="text-sm text-muted-foreground text-pretty">
          The listing rating and review count are recalculated straight away.
        </p>
      </ConfirmDialog>
    </div>
  );
}
