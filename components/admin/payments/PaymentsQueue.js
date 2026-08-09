'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Copy,
  ExternalLink,
  ImageOff,
  Receipt,
  Wallet,
  X,
  ZoomIn,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Field';
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
  Stacked,
  Table,
  TableWrap,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/admin/Table';
import Modal from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend, formatDateTime } from '@/components/admin/client';
import { formatPKR, timeAgo } from '@/lib/utils';

/** Full-size receipt viewer. Escape closes; the backdrop is a real button. */
function Lightbox({ open, src, caption, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close the receipt"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 cursor-zoom-out bg-[var(--overlay)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={caption || 'Payment receipt'}
        className="animate-scale-in relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">{caption}</p>
          <div className="flex items-center gap-1.5">
            <Button as="a" href={src} target="_blank" rel="noreferrer" variant="ghost" size="sm">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Open original
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-surface-sunken p-3">
          <ReceiptImage src={src} alt={caption} className="mx-auto max-h-[70dvh] w-auto" />
        </div>
      </div>
    </div>
  );
}

/** Falls back to a labelled tile when a receipt points at a missing file. */
function ReceiptImage({ src, alt, className, thumb }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={
          thumb
            ? 'grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-border-strong bg-surface-sunken text-muted-foreground'
            : 'mx-auto grid h-64 w-full max-w-sm place-items-center rounded-xl border border-dashed border-border-strong bg-surface text-muted-foreground'
        }
        role="img"
        aria-label="Receipt image is unavailable"
      >
        <ImageOff className={thumb ? 'size-5' : 'size-8'} aria-hidden="true" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt || 'Payment receipt'}
      onError={() => setBroken(true)}
      className={className}
      loading="lazy"
    />
  );
}

export default function PaymentsQueue({ rows, total, page, pages, perPage, methods, stats }) {
  const router = useRouter();
  const toast = useToast();
  const { get, set, reset, pending } = useAdminQuery();

  const [lightbox, setLightbox] = useState(null);
  const [busy, setBusy] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const filtersActive = ['q', 'status', 'method'].some((k) => get(k));

  async function approve(row) {
    setBusy(row._id);
    const res = await apiSend(`/api/admin/payments/${row._id}`, {
      method: 'PATCH',
      body: { action: 'approve' },
    });
    setBusy(null);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not approve', description: res.error });
    toast({
      title: res.data?.alreadyDone ? 'Already approved' : 'Payment approved',
      description: res.data?.published
        ? `${row.hostel?.name || 'The listing'} is live and the owner has been emailed.`
        : 'The owner has been emailed.',
    });
    router.refresh();
  }

  async function submitRejection() {
    if (!reject) return;
    if (reason.trim().length < 5) {
      return toast({ tone: 'warning', title: 'Add a reason', description: 'The owner receives it by email.' });
    }
    setSaving(true);
    const res = await apiSend(`/api/admin/payments/${reject._id}`, {
      method: 'PATCH',
      body: { action: 'reject', reason: reason.trim() },
    });
    setSaving(false);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not reject', description: res.error });
    setReject(null);
    setReason('');
    toast({ tone: 'info', title: 'Payment rejected', description: 'The listing is back to “awaiting payment”.' });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Pending', value: stats.pending, tone: 'warning' },
          { label: 'Approved', value: stats.approved, tone: 'success' },
          { label: 'Rejected', value: stats.rejected, tone: 'danger' },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3"
          >
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <Badge tone={s.tone} className="tabular">
              {s.value.toLocaleString('en-PK')}
            </Badge>
          </div>
        ))}
      </div>

      <FilterBar>
        <SearchBox
          value={get('q')}
          onSearch={(v) => set({ q: v })}
          placeholder="Transaction ref, hostel or owner…"
        />
        <FilterSelect
          label="Status"
          value={get('status')}
          onChange={(v) => set({ status: v })}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
          allLabel="All statuses"
        />
        <FilterSelect
          label="Method"
          value={get('method')}
          onChange={(v) => set({ method: v })}
          options={methods}
          allLabel="Any method"
        />
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      <PendingOverlay pending={pending}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filtersActive ? 'No payments match those filters' : 'No payments yet'}
            description={
              filtersActive
                ? 'Reset the filters to see the whole ledger.'
                : 'Owners upload a bank, JazzCash or Easypaisa screenshot and it lands here for approval.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={reset}>
                  Reset filters
                </Button>
              ) : (
                <Button href="/admin/listings?status=pending_payment" variant="secondary" size="sm">
                  See listings awaiting payment
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table minWidth="min-w-[72rem]">
                <THead>
                  <tr>
                    <Th width="5rem">Receipt</Th>
                    <Th>Listing</Th>
                    <Th>Owner</Th>
                    <Th align="right">Amount</Th>
                    <Th>Method</Th>
                    <Th>Transaction ref</Th>
                    <Th>Submitted</Th>
                    <Th>Status</Th>
                    <Th align="right" width="15rem">
                      <span className="sr-only">Decision</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <Tr key={row._id}>
                      <Td>
                        <button
                          type="button"
                          onClick={() =>
                            setLightbox({
                              src: row.screenshot,
                              caption: `${row.hostel?.name || 'Listing'} · ${formatPKR(row.amount)} · ${row.transactionRef || 'no reference'}`,
                            })
                          }
                          aria-label={`View the receipt for ${row.hostel?.name || 'this payment'} at full size`}
                          className="group relative block cursor-zoom-in overflow-hidden rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <ReceiptImage
                            src={row.screenshot}
                            alt=""
                            thumb
                            className="size-14 object-cover"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 grid place-items-center bg-[var(--overlay)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          >
                            <ZoomIn className="size-4 text-white" />
                          </span>
                        </button>
                      </Td>
                      <Td>
                        {row.hostel ? (
                          <Link
                            href={`/admin/listings/${row.hostel._id}/edit`}
                            className="block max-w-56 truncate font-medium text-foreground transition-colors duration-150 hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                          >
                            {row.hostel.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Deleted listing</span>
                        )}
                        {row.hostel && (
                          <p className="text-xs text-muted-foreground">
                            {row.hostel.city} · {row.hostel.status.replace(/_/g, ' ')}
                          </p>
                        )}
                      </Td>
                      <Td>
                        {row.owner ? (
                          <Link href={`/admin/users/${row.owner._id}`} className="block max-w-44">
                            <Stacked primary={row.owner.name} secondary={row.owner.email} />
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Deleted account</span>
                        )}
                      </Td>
                      <Td align="right" className="tabular whitespace-nowrap font-medium">
                        {formatPKR(row.amount)}
                      </Td>
                      <Td>
                        <Badge tone="neutral" size="sm">
                          <Wallet className="size-3" aria-hidden="true" />
                          {row.method}
                        </Badge>
                      </Td>
                      <Td>
                        {row.transactionRef ? (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(row.transactionRef);
                              toast({ title: 'Reference copied', description: row.transactionRef });
                            }}
                            className="tabular inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            {row.transactionRef}
                            <Copy className="size-3 text-muted-foreground" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">None given</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <Stacked
                          primary={timeAgo(row.createdAt)}
                          secondary={formatDateTime(row.paidAt || row.createdAt)}
                        />
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} size="sm" />
                        {row.status !== 'pending' && row.reviewedAt && (
                          <p className="mt-0.5 max-w-40 truncate text-xs text-muted-foreground">
                            {row.reviewer?.name ? `by ${row.reviewer.name}` : ''}{' '}
                            {timeAgo(row.reviewedAt)}
                          </p>
                        )}
                        {row.reviewNote && (
                          <p className="mt-0.5 max-w-44 truncate text-xs text-danger" title={row.reviewNote}>
                            {row.reviewNote}
                          </p>
                        )}
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant={row.status === 'approved' ? 'secondary' : 'primary'}
                            loading={busy === row._id}
                            disabled={row.status === 'approved'}
                            onClick={() => approve(row)}
                          >
                            <Check className="size-3.5" aria-hidden="true" />
                            {row.status === 'approved' ? 'Approved' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={row.status === 'rejected'}
                            onClick={() => {
                              setReject(row);
                              setReason(row.reviewNote || '');
                            }}
                          >
                            <X className="size-3.5" aria-hidden="true" />
                            {row.status === 'rejected' ? 'Rejected' : 'Reject'}
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableWrap>

            <Pagination
              page={page}
              pages={pages}
              total={total}
              perPage={perPage}
              onPage={(n) => set({ page: n }, { keepPage: true })}
              label="payments"
            />
          </>
        )}
      </PendingOverlay>

      <Lightbox
        open={Boolean(lightbox)}
        src={lightbox?.src}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />

      <Modal
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        title="Reject this payment"
        description="The listing returns to “awaiting payment” and the owner is emailed your reason."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setReject(null)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={saving} onClick={submitRejection}>
              Reject and notify
            </Button>
          </>
        }
      >
        <Textarea
          data-autofocus
          label="Reason"
          required
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="The screenshot is cropped, so we cannot read the transaction reference."
          hint="At least 5 characters. This is sent to the owner verbatim."
        />
      </Modal>
    </div>
  );
}
