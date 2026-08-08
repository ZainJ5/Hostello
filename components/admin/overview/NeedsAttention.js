'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Check, Inbox, Wallet, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Field';
import Modal from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { formatPKR, timeAgo } from '@/lib/utils';

/**
 * The queue that decides whether owners get paid attention today. Approving
 * and rejecting both happen here without leaving the dashboard; rejection
 * always collects a reason, because the owner receives it by email.
 */
export default function NeedsAttention({ payments = [], listings = [] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const total = payments.length + listings.length;

  async function approvePayment(p) {
    setBusy(`payment-${p._id}`);
    const res = await apiSend(`/api/admin/payments/${p._id}`, {
      method: 'PATCH',
      body: { action: 'approve' },
    });
    setBusy(null);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not approve', description: res.error });
    toast({
      title: res.data?.alreadyDone ? 'Already approved' : 'Payment approved',
      description: res.data?.published
        ? `${p.hostelId?.name || 'The listing'} is now live and the owner has been emailed.`
        : 'The owner has been emailed.',
    });
    router.refresh();
  }

  async function approveListing(h) {
    setBusy(`listing-${h._id}`);
    const res = await apiSend(`/api/admin/listings/${h._id}`, {
      method: 'PATCH',
      body: { patch: 'state', status: 'published' },
    });
    setBusy(null);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not publish', description: res.error });
    toast({ title: 'Listing published', description: `${h.name} is now live.` });
    router.refresh();
  }

  async function submitRejection() {
    if (!reject) return;
    if (reason.trim().length < 5) {
      return toast({ tone: 'warning', title: 'Add a reason', description: 'At least 5 characters — the owner sees this.' });
    }
    setSaving(true);
    const res =
      reject.type === 'payment'
        ? await apiSend(`/api/admin/payments/${reject.row._id}`, {
            method: 'PATCH',
            body: { action: 'reject', reason: reason.trim() },
          })
        : await apiSend(`/api/admin/listings/${reject.row._id}`, {
            method: 'PATCH',
            body: { patch: 'state', status: 'rejected', reason: reason.trim() },
          });
    setSaving(false);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not reject', description: res.error });
    setReject(null);
    setReason('');
    toast({ tone: 'info', title: 'Rejected', description: 'The owner has been emailed the reason.' });
    router.refresh();
  }

  return (
    <>
      <Card className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Needs your attention</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Payments to verify and listings waiting on a decision.
            </p>
          </div>
          {total > 0 && (
            <Badge tone="danger" className="tabular shrink-0">
              {total}
            </Badge>
          )}
        </div>

        {total === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Inbox}
              title="Nothing is waiting"
              description="Every payment has been reviewed and no listing is stuck in review."
              action={
                <Button href="/admin/listings" variant="secondary" size="sm">
                  Browse all listings
                </Button>
              }
              className="py-10"
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning dark:bg-warning/15 dark:text-amber-300">
                  <Wallet className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.hostelId?.name || 'Deleted listing'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="tabular">{formatPKR(p.amount)}</span> · {p.method} ·{' '}
                    {p.ownerId?.name || p.ownerId?.email || 'Unknown owner'} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busy === `payment-${p._id}`}
                    onClick={() => approvePayment(p)}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReject({ type: 'payment', row: p });
                      setReason('');
                    }}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}

            {listings.map((h) => (
              <li key={h._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-soft text-info dark:bg-info/15 dark:text-sky-300">
                  <Building2 className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                    <Link
                      href={`/admin/listings/${h._id}/edit`}
                      className="truncate hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                    >
                      {h.name}
                    </Link>
                    <StatusBadge status={h.status} size="sm" />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {h.city} · {h.ownerId?.name || 'Unassigned'} · submitted {timeAgo(h.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busy === `listing-${h._id}`}
                    onClick={() => approveListing(h)}
                  >
                    <Check className="size-3.5" aria-hidden="true" />
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReject({ type: 'listing', row: h });
                      setReason('');
                    }}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        title={reject?.type === 'payment' ? 'Reject this payment' : 'Reject this listing'}
        description={
          reject?.type === 'payment'
            ? 'The listing returns to “awaiting payment” and the owner is emailed your reason.'
            : 'The owner is emailed your reason and can resubmit once it is fixed.'
        }
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
          placeholder="The screenshot is cropped — we cannot read the transaction reference."
          hint={`${reason.trim().length}/5 characters minimum`}
        />
      </Modal>
    </>
  );
}
