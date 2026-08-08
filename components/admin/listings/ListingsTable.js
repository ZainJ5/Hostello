'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Ban,
  Building2,
  CircleCheck,
  ExternalLink,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, Rating } from '@/components/ui/Feedback';
import { Select, Textarea } from '@/components/ui/Field';
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
  RowCheckbox,
  Stacked,
  Table,
  TableWrap,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/admin/Table';
import ActionMenu from '@/components/admin/ActionMenu';
import Modal, { ConfirmDialog } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend } from '@/components/admin/client';
import { STATUS_OPTIONS } from '@/components/admin/labels';
import { formatCompact, formatPKR, timeAgo } from '@/lib/utils';

const BULK_ACTIONS = [
  { value: 'publish', label: 'Publish', icon: CircleCheck },
  { value: 'suspend', label: 'Suspend', icon: Ban },
  { value: 'verify', label: 'Mark verified', icon: ShieldCheck },
  { value: 'unverify', label: 'Remove verified' },
  { value: 'feature', label: 'Feature', icon: Sparkles },
  { value: 'unfeature', label: 'Unfeature' },
  { value: 'markAvailable', label: 'Mark available' },
  { value: 'markUnavailable', label: 'Mark full' },
];

export default function ListingsTable({ rows, total, page, pages, perPage, facets }) {
  const router = useRouter();
  const toast = useToast();
  const { get, set, toggleSort, reset, pending } = useAdminQuery();

  const [selected, setSelected] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState('publish');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [nextStatus, setNextStatus] = useState('published');
  const [reason, setReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const sort = get('sort', 'createdAt');
  const dir = get('dir', 'desc');

  const filtersActive = useMemo(
    () =>
      ['q', 'status', 'city', 'university', 'gender', 'owner'].some((k) => get(k)),
    [get]
  );

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const someOnPage = rows.some((r) => selected.has(r._id));

  function toggleAll(checked) {
    const next = new Set(selected);
    for (const r of rows) {
      if (checked) next.add(r._id);
      else next.delete(r._id);
    }
    setSelected(next);
  }

  function toggleOne(id, checked) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  async function runBulk() {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    const res = await apiSend('/api/admin/listings/bulk', {
      method: 'POST',
      body: { ids, action: bulkAction },
    });
    setBulkBusy(false);
    if (!res.ok) {
      return toast({ tone: 'danger', title: 'Bulk action failed', description: res.error });
    }
    toast({
      title: `${res.data.modified} listing${res.data.modified === 1 ? '' : 's'} updated`,
      description: BULK_ACTIONS.find((a) => a.value === bulkAction)?.label,
    });
    setSelected(new Set());
    router.refresh();
  }

  async function applyState(row, patch, successTitle) {
    const res = await apiSend(`/api/admin/listings/${row._id}`, {
      method: 'PATCH',
      body: { patch: 'state', ...patch },
    });
    if (!res.ok) {
      return toast({ tone: 'danger', title: 'Could not update', description: res.error });
    }
    toast({ title: successTitle, description: row.name });
    router.refresh();
  }

  async function saveStatus() {
    if (!statusTarget) return;
    if (nextStatus === 'rejected' && reason.trim().length < 5) {
      return toast({
        tone: 'warning',
        title: 'Add a reason',
        description: 'Rejections are emailed to the owner.',
      });
    }
    setStatusBusy(true);
    const res = await apiSend(`/api/admin/listings/${statusTarget._id}`, {
      method: 'PATCH',
      body: { patch: 'state', status: nextStatus, reason: reason.trim() },
    });
    setStatusBusy(false);
    if (!res.ok) {
      return toast({ tone: 'danger', title: 'Could not change status', description: res.error });
    }
    setStatusTarget(null);
    setReason('');
    toast({ title: 'Status updated', description: `${statusTarget.name} → ${nextStatus.replace(/_/g, ' ')}` });
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await apiSend(`/api/admin/listings/${deleteTarget._id}`, { method: 'DELETE' });
    if (!res.ok) {
      return toast({ tone: 'danger', title: 'Could not delete', description: res.error });
    }
    setDeleteTarget(null);
    toast({ tone: 'info', title: 'Listing deleted', description: `${deleteTarget.name} and its bookings, reviews and payments were removed.` });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <SearchBox
          value={get('q')}
          onSearch={(v) => set({ q: v })}
          placeholder="Search name, area or address…"
        />
        <FilterSelect
          label="Status"
          value={get('status')}
          onChange={(v) => set({ status: v })}
          options={STATUS_OPTIONS}
          allLabel="Any status"
        />
        <FilterSelect
          label="City"
          value={get('city')}
          onChange={(v) => set({ city: v })}
          options={facets.cities}
          allLabel="All cities"
        />
        <FilterSelect
          label="University"
          value={get('university')}
          onChange={(v) => set({ university: v })}
          options={facets.universities}
          allLabel="All universities"
        />
        <FilterSelect
          label="Gender"
          value={get('gender')}
          onChange={(v) => set({ gender: v })}
          options={['Male', 'Female', 'Mixed']}
          allLabel="Any"
        />
        <FilterSelect
          label="Owner"
          value={get('owner')}
          onChange={(v) => set({ owner: v })}
          options={[...facets.owners, { value: 'none', label: 'Unassigned' }]}
          allLabel="All owners"
        />
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      {selected.size > 0 && (
        <div className="animate-fade-in flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-brand-600/40 bg-brand-50 p-2.5 dark:bg-brand-950/50">
          <span className="tabular px-1 text-sm font-medium text-brand-900 dark:text-brand-200">
            {selected.size} selected
          </span>
          <div className="min-w-44">
            <Select
              aria-label="Bulk action"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="h-10"
            >
              {BULK_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" onClick={runBulk} loading={bulkBusy}>
            <Upload className="size-3.5" aria-hidden="true" />
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <PendingOverlay pending={pending}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={filtersActive ? 'No listings match those filters' : 'No listings yet'}
            description={
              filtersActive
                ? 'Try widening the search, or reset the filters to see everything.'
                : 'Create the first listing, or wait for an owner to submit one.'
            }
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={reset}>
                  Reset filters
                </Button>
              ) : (
                <Button href="/admin/listings/new" size="sm">
                  New listing
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table minWidth="min-w-[74rem]">
                <THead>
                  <tr>
                    <Th width="3rem">
                      <RowCheckbox
                        checked={allOnPage}
                        indeterminate={!allOnPage && someOnPage}
                        onChange={toggleAll}
                        label="Select every listing on this page"
                      />
                    </Th>
                    <Th sortKey="name" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Listing
                    </Th>
                    <Th>Owner</Th>
                    <Th sortKey="status" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Status
                    </Th>
                    <Th sortKey="price" activeSort={sort} dir={dir} onSort={toggleSort} align="right">
                      Rent
                    </Th>
                    <Th sortKey="views" activeSort={sort} dir={dir} onSort={toggleSort} align="right">
                      Views
                    </Th>
                    <Th align="right">Bookings</Th>
                    <Th sortKey="rating" activeSort={sort} dir={dir} onSort={toggleSort} align="right">
                      Rating
                    </Th>
                    <Th sortKey="createdAt" activeSort={sort} dir={dir} onSort={toggleSort} align="right">
                      Added
                    </Th>
                    <Th width="4rem" align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <Tr key={row._id} selected={selected.has(row._id)}>
                      <Td>
                        <RowCheckbox
                          checked={selected.has(row._id)}
                          onChange={(c) => toggleOne(row._id, c)}
                          label={`Select ${row.name}`}
                        />
                      </Td>
                      <Td>
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/admin/listings/${row._id}/edit`}
                              className="block truncate font-medium text-foreground transition-colors duration-150 hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                            >
                              {row.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {[row.area, row.city].filter(Boolean).join(' · ')}
                              {row.gender ? ` · ${row.gender}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {row.verified && (
                              <span title="Verified">
                                <BadgeCheck
                                  className="size-4 text-info"
                                  aria-label="Verified listing"
                                />
                              </span>
                            )}
                            {row.featured && (
                              <span title="Featured">
                                <Sparkles
                                  className="size-4 text-accent-600 dark:text-accent-300"
                                  aria-label="Featured listing"
                                />
                              </span>
                            )}
                            {!row.available && (
                              <Badge tone="neutral" size="sm">
                                Full
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {row.owner ? (
                          <Link
                            href={`/admin/users/${row.owner._id}`}
                            className="block max-w-40 truncate text-sm text-foreground transition-colors duration-150 hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                          >
                            {row.owner.name || row.owner.email}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} size="sm" />
                      </Td>
                      <Td align="right" className="tabular whitespace-nowrap">
                        {formatPKR(row.price)}
                      </Td>
                      <Td align="right" className="tabular">
                        {formatCompact(row.views)}
                      </Td>
                      <Td align="right" className="tabular">
                        {row.bookings || 0}
                      </Td>
                      <Td align="right">
                        {row.reviewCount ? (
                          <Rating value={row.rating} count={row.reviewCount} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No reviews</span>
                        )}
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(row.createdAt)}
                      </Td>
                      <Td align="right">
                        <ActionMenu
                          label={`Actions for ${row.name}`}
                          items={[
                            {
                              label: 'View public page',
                              href: `/hostels/${row.slug}`,
                              icon: ExternalLink,
                              external: true,
                            },
                            {
                              label: 'Edit listing',
                              href: `/admin/listings/${row._id}/edit`,
                              icon: Pencil,
                            },
                            { separator: true },
                            {
                              label: 'Change status…',
                              icon: CircleCheck,
                              onSelect: () => {
                                setStatusTarget(row);
                                setNextStatus(row.status);
                                setReason(row.rejectionReason || '');
                              },
                            },
                            {
                              label: row.verified ? 'Remove verified' : 'Mark verified',
                              icon: ShieldCheck,
                              onSelect: () =>
                                applyState(
                                  row,
                                  { verified: !row.verified },
                                  row.verified ? 'Verification removed' : 'Marked verified'
                                ),
                            },
                            {
                              label: row.featured ? 'Unfeature' : 'Feature',
                              icon: Sparkles,
                              onSelect: () =>
                                applyState(
                                  row,
                                  { featured: !row.featured },
                                  row.featured ? 'Removed from featured' : 'Featured'
                                ),
                            },
                            { separator: true },
                            {
                              label: 'Delete listing',
                              icon: Trash2,
                              tone: 'danger',
                              onSelect: () => setDeleteTarget(row),
                            },
                          ]}
                        />
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
              label="listings"
            />
          </>
        )}
      </PendingOverlay>

      {/* ── Change status ── */}
      <Modal
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        title="Change listing status"
        description={statusTarget?.name}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setStatusTarget(null)} disabled={statusBusy}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveStatus} loading={statusBusy}>
              Save status
            </Button>
          </>
        }
      >
        <Select
          data-autofocus
          label="New status"
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value)}
          hint="Only published listings appear on the public site."
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        {nextStatus === 'rejected' && (
          <div className="mt-3">
            <Textarea
              label="Reason for rejection"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Photos do not match the address given."
              hint="Saved on the listing so the owner can act on it."
            />
          </div>
        )}
      </Modal>

      {/* ── Delete ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this listing?"
        description="This also deletes its bookings, reviews, payments and traffic history."
        confirmLabel="Delete permanently"
        confirmPhrase={deleteTarget?.name}
      >
        <p className="text-sm text-muted-foreground text-pretty">
          <span className="font-medium text-foreground">{deleteTarget?.name}</span> will be removed
          from the marketplace immediately. If you only want it off the public site, suspend it
          instead.
        </p>
      </ConfirmDialog>
    </div>
  );
}
