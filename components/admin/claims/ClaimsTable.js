'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Check, ExternalLink, ImageOff, X } from 'lucide-react';
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
import { timeAgo } from '@/lib/utils';

const ROLE_LABEL = {
  owner: 'Owns it',
  manager: 'Manages it',
  staff: 'Works there',
};

/** Falls back to a labelled tile when proof points at a missing file. */
function ProofImage({ src, alt, className, thumb }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={
          thumb
            ? 'grid size-14 shrink-0 place-items-center rounded-lg border border-dashed border-border-strong bg-surface-sunken text-muted-foreground'
            : 'grid h-48 w-full place-items-center rounded-xl border border-dashed border-border-strong bg-surface text-muted-foreground'
        }
        role="img"
        aria-label="This photo is no longer on disk"
      >
        <ImageOff className={thumb ? 'size-5' : 'size-7'} aria-hidden="true" />
      </div>
    );
  }

  return (
    // Not next/image: proof is a runtime upload the optimiser has never seen,
    // and it is a document being read once rather than page furniture.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || 'Proof of ownership'}
      onError={() => setBroken(true)}
      className={className}
      loading="lazy"
    />
  );
}

/**
 * The claims queue.
 *
 * APPROVING IS THE CONSEQUENTIAL BUTTON on this page, more than anywhere else
 * in the console: it hands a stranger a listing, puts their number in front of
 * students, and turns their account into an owner account. So approving is not
 * a row action the way "publish" is. It opens the claim, shows what the person
 * actually wrote and attached, and asks again there. Rejecting needs a reason,
 * because the reason is what the claimant receives and what tells them whether
 * it is worth sending better proof.
 */
export default function ClaimsTable({ rows, total, page, pages, perPage, stats }) {
  const router = useRouter();
  const toast = useToast();
  const { get, set, reset, pending } = useAdminQuery();

  const [open, setOpen] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(null);

  const filtersActive = ['q', 'status'].some((k) => get(k));

  async function approve(claim) {
    setSaving(true);
    const res = await apiSend(`/api/admin/claims/${claim._id}`, {
      method: 'PATCH',
      body: { action: 'approve', note: note.trim() },
    });
    setSaving(false);
    if (!res.ok) {
      return toast({ tone: 'danger', title: 'Could not approve', description: res.error });
    }
    setOpen(null);
    setNote('');
    const closed = res.data?.otherClaimsClosed || 0;
    toast({
      title: res.data?.alreadyDone ? 'Already approved' : 'Listing handed over',
      description:
        `${claim.hostelName} is now on ${claim.claimantEmail}, and the number is live.` +
        (res.data?.promoted ? ' Their account is now an owner account.' : '') +
        (closed ? ` ${closed} other claim${closed > 1 ? 's' : ''} on it closed.` : ''),
    });
    router.refresh();
  }

  async function submitRejection() {
    if (!reject) return;
    if (reason.trim().length < 5) {
      return toast({
        tone: 'warning',
        title: 'Add a reason',
        description: 'The claimant receives it by email, so it should say what would settle it.',
      });
    }
    setSaving(true);
    const res = await apiSend(`/api/admin/claims/${reject._id}`, {
      method: 'PATCH',
      body: { action: 'reject', reason: reason.trim() },
    });
    setSaving(false);
    if (!res.ok) {
      return toast({ tone: 'danger', title: 'Could not reject', description: res.error });
    }
    setReject(null);
    setOpen(null);
    setReason('');
    toast({ tone: 'info', title: 'Claim rejected', description: 'They have been emailed the reason.' });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Pending', value: stats.pending || 0, tone: 'warning' },
          { label: 'Approved', value: stats.approved || 0, tone: 'success' },
          { label: 'Rejected', value: stats.rejected || 0, tone: 'danger' },
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
          placeholder="Hostel, claimant or number…"
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
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      <PendingOverlay pending={pending}>
        {rows.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title={filtersActive ? 'No claims match those filters' : 'No claims yet'}
            description={
              filtersActive
                ? 'Reset the filters to see them all.'
                : 'Listings with no owner carry a "Claim this listing" prompt. When somebody fills it in, it lands here.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={reset}>
                  Reset filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table minWidth="min-w-[64rem]">
                <THead>
                  <tr>
                    <Th>Listing</Th>
                    <Th>Claimant</Th>
                    <Th>Says they</Th>
                    <Th>Number given</Th>
                    <Th>Proof</Th>
                    <Th>Filed</Th>
                    <Th>Status</Th>
                    <Th align="right" width="9rem">
                      <span className="sr-only">Open</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <Tr key={row._id}>
                      <Td>
                        {row.hostel ? (
                          <Link
                            href={`/admin/listings/${row.hostel._id}/edit`}
                            className="block max-w-56 truncate font-medium text-foreground transition-colors duration-150 hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                          >
                            {row.hostelName}
                          </Link>
                        ) : (
                          <span className="block max-w-56 truncate font-medium text-foreground">
                            {row.hostelName}
                          </span>
                        )}
                        {row.hostel ? (
                          <p className="text-xs text-muted-foreground">
                            {[row.hostel.area, row.hostel.city].filter(Boolean).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Listing since deleted</p>
                        )}
                      </Td>
                      <Td>
                        <Link href={`/admin/users/${row.claimantId}`} className="block max-w-48">
                          <Stacked primary={row.claimantName} secondary={row.claimantEmail} />
                        </Link>
                      </Td>
                      <Td>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_LABEL[row.role] || row.role}
                        </span>
                      </Td>
                      <Td>
                        <span className="tabular text-sm text-foreground">{row.phone}</span>
                      </Td>
                      <Td>
                        {row.proof?.length ? (
                          <span className="text-sm text-muted-foreground">
                            {row.proof.length} photo{row.proof.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Text only</span>
                        )}
                      </Td>
                      <Td>
                        <span className="text-sm text-muted-foreground">
                          {timeAgo(row.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} />
                      </Td>
                      <Td align="right">
                        <Button
                          size="sm"
                          variant={row.status === 'pending' ? 'primary' : 'secondary'}
                          onClick={() => {
                            setOpen(row);
                            setNote('');
                          }}
                        >
                          {row.status === 'pending' ? 'Review' : 'Open'}
                        </Button>
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
              label="claims"
            />
          </>
        )}
      </PendingOverlay>

      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        size="lg"
        title={open ? `Claim on ${open.hostelName}` : ''}
        description={
          open
            ? `${open.claimantName} (${open.claimantEmail}) · ${ROLE_LABEL[open.role] || open.role} · filed ${formatDateTime(open.createdAt)}`
            : ''
        }
        footer={
          open?.status === 'pending' ? (
            <>
              <Button variant="secondary" onClick={() => setOpen(null)}>
                Close
              </Button>
              <Button
                variant="danger"
                disabled={saving}
                onClick={() => {
                  setReject(open);
                  setReason('');
                }}
              >
                <X className="size-3.5" aria-hidden="true" />
                Reject
              </Button>
              <Button disabled={saving} onClick={() => approve(open)}>
                <Check className="size-3.5" aria-hidden="true" />
                {saving ? 'Handing over…' : 'Approve and hand over'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setOpen(null)}>
              Close
            </Button>
          )
        }
      >
        {open ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface-sunken px-4 py-3">
                <p className="text-xs text-muted-foreground">Number to put on the listing</p>
                <p className="tabular text-sm font-semibold text-foreground">{open.phone}</p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-surface-sunken px-4 py-3">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="tabular text-sm font-semibold text-foreground">
                  {open.whatsapp || open.phone}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                What they said
              </p>
              <p className="text-sm whitespace-pre-wrap text-foreground">{open.evidence}</p>
            </div>

            {open.proof?.length ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  What they attached
                </p>
                <ul className="flex flex-wrap gap-2">
                  {open.proof.map((src) => (
                    <li key={src}>
                      <button
                        type="button"
                        onClick={() => setZoom(src)}
                        aria-label="View this photo at full size"
                        className="block cursor-zoom-in overflow-hidden rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <ProofImage src={src} alt="" thumb className="size-20 object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {open.status === 'pending' ? (
              <>
                <Textarea
                  label="Note (optional)"
                  hint="Kept on the claim and in the audit trail. The claimant does not see it."
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="rounded-[var(--radius-card)] border border-border bg-surface-sunken px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Approving assigns {open.hostelName} to this account, replaces the
                    listing&rsquo;s number with the one above, marks the listing as kept by its
                    owner, and closes any other claim on it.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-[var(--radius-card)] border border-border bg-surface-sunken px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {open.status === 'approved' ? 'Approved' : 'Rejected'}{' '}
                  {open.reviewedAt ? formatDateTime(open.reviewedAt) : ''}
                </p>
                {open.decisionNote ? (
                  <p className="mt-1 text-sm text-foreground">{open.decisionNote}</p>
                ) : null}
              </div>
            )}

            {open.hostel ? (
              <a
                href={`/hostels/${open.hostel.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Open the public listing
              </a>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(reject)}
        onClose={() => setReject(null)}
        title="Reject this claim"
        description="The reason is emailed to them, so write what would settle it if they try again."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReject(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={saving} onClick={submitRejection}>
              {saving ? 'Rejecting…' : 'Reject and email them'}
            </Button>
          </>
        }
      >
        <Textarea
          label="Reason"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="We could not match the bill you sent to this address. A utility bill or rent agreement in the hostel's name would settle it."
        />
      </Modal>

      {zoom ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close the photo"
            onClick={() => setZoom(null)}
            className="animate-fade-in absolute inset-0 cursor-zoom-out bg-[var(--overlay)]"
          />
          <div className="animate-scale-in relative max-h-full w-full max-w-3xl overflow-auto rounded-[var(--radius-panel)] border border-border bg-surface p-3">
            <ProofImage src={zoom} alt="Proof of ownership" className="mx-auto max-h-[80dvh] w-auto" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
