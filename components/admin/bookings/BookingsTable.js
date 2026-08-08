'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Mail, Phone, Building2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { Avatar, EmptyState } from '@/components/ui/Feedback';
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
  Stacked,
  Table,
  TableWrap,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from '@/components/admin/Table';
import { Drawer } from '@/components/admin/Modal';
import { useToast } from '@/components/admin/ToastProvider';
import { apiSend, formatDateTime } from '@/components/admin/client';
import { BOOKING_STATUS_OPTIONS } from '@/components/admin/labels';
import { formatDate, timeAgo } from '@/lib/utils';

function DateField({ label, value, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer rounded-xl border border-border bg-surface px-3 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
      />
    </label>
  );
}

function Detail({ label, children }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b border-border py-2 last:border-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground text-pretty">{children ?? '—'}</dd>
    </div>
  );
}

export default function BookingsTable({ rows, total, page, pages, perPage, hostels, stats }) {
  const router = useRouter();
  const toast = useToast();
  const { get, set, toggleSort, reset, pending } = useAdminQuery();

  const [open, setOpen] = useState(null);
  const [nextStatus, setNextStatus] = useState('pending');
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const sort = get('sort', 'createdAt');
  const dir = get('dir', 'desc');
  const filtersActive = ['q', 'status', 'hostel', 'from', 'to'].some((k) => get(k));

  function openDrawer(row) {
    setOpen(row);
    setNextStatus(row.status);
    setResponse(row.ownerResponse || '');
  }

  async function save() {
    if (!open) return;
    setSaving(true);
    const res = await apiSend(`/api/admin/bookings/${open._id}`, {
      method: 'PATCH',
      body: { status: nextStatus, response },
    });
    setSaving(false);
    if (!res.ok) return toast({ tone: 'danger', title: 'Could not update', description: res.error });
    toast({
      title: res.data?.alreadyDone ? 'Already up to date' : 'Booking updated',
      description: `${open.studentName || 'Request'} → ${nextStatus}`,
    });
    setOpen(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {BOOKING_STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => set({ status: get('status') === s.value ? '' : s.value })}
            aria-pressed={get('status') === s.value}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              get('status') === s.value
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/50'
                : 'border-border bg-surface hover:bg-muted/60'
            }`}
          >
            <span className="text-sm text-muted-foreground">{s.label}</span>
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
          placeholder="Student name, email or phone…"
        />
        <FilterSelect
          label="Status"
          value={get('status')}
          onChange={(v) => set({ status: v })}
          options={BOOKING_STATUS_OPTIONS}
          allLabel="Any status"
        />
        <FilterSelect
          label="Listing"
          value={get('hostel')}
          onChange={(v) => set({ hostel: v })}
          options={hostels}
          allLabel="All listings"
          className="max-w-56"
        />
        <DateField label="From" value={get('from')} onChange={(v) => set({ from: v })} />
        <DateField label="To" value={get('to')} onChange={(v) => set({ to: v })} />
        <ResetFilters onReset={reset} active={filtersActive} />
      </FilterBar>

      <PendingOverlay pending={pending}>
        {rows.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={filtersActive ? 'No bookings match those filters' : 'No booking requests yet'}
            description={
              filtersActive
                ? 'Widen the date range or clear the filters.'
                : 'Requests appear here the moment a student enquires about a listing.'
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
              <Table minWidth="min-w-[64rem]">
                <THead>
                  <tr>
                    <Th sortKey="studentName" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Student
                    </Th>
                    <Th>Listing</Th>
                    <Th>Room</Th>
                    <Th sortKey="moveInDate" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Move-in
                    </Th>
                    <Th align="right">Months</Th>
                    <Th sortKey="status" activeSort={sort} dir={dir} onSort={toggleSort}>
                      Status
                    </Th>
                    <Th sortKey="createdAt" activeSort={sort} dir={dir} onSort={toggleSort} align="right">
                      Requested
                    </Th>
                    <Th align="right" width="7rem">
                      <span className="sr-only">Detail</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <Tr key={row._id} onClick={() => openDrawer(row)}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.studentName || row.studentEmail} size="sm" />
                          <Stacked primary={row.studentName || '—'} secondary={row.studentEmail} />
                        </div>
                      </Td>
                      <Td>
                        {row.hostel ? (
                          <Link
                            href={`/admin/listings/${row.hostel._id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="block max-w-52 truncate text-sm font-medium text-foreground transition-colors duration-150 hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                          >
                            {row.hostel.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Deleted listing</span>
                        )}
                      </Td>
                      <Td className="text-sm text-muted-foreground">{row.roomType || '—'}</Td>
                      <Td className="whitespace-nowrap text-sm">
                        {row.moveInDate ? formatDate(row.moveInDate) : '—'}
                      </Td>
                      <Td align="right" className="tabular">
                        {row.durationMonths || 1}
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} size="sm" />
                      </Td>
                      <Td align="right" className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(row.createdAt)}
                      </Td>
                      <Td align="right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(row);
                          }}
                        >
                          Details
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
              label="bookings"
            />
          </>
        )}
      </PendingOverlay>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.studentName || 'Booking request'}
        description={open ? `Requested ${formatDateTime(open.createdAt)}` : ''}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setOpen(null)} disabled={saving}>
              Close
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        {open && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={open.status} />
              {open.respondedAt && (
                <Badge tone="neutral" size="sm">
                  Answered {timeAgo(open.respondedAt)}
                </Badge>
              )}
            </div>

            <dl>
              <Detail label="Student">
                <div className="flex items-center gap-2">
                  <Avatar name={open.studentName} size="sm" />
                  <span>{open.studentName || '—'}</span>
                </div>
              </Detail>
              <Detail label="Email">
                {open.studentEmail ? (
                  <a
                    href={`mailto:${open.studentEmail}`}
                    className="inline-flex items-center gap-1.5 text-brand-700 hover:underline dark:text-brand-300"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                    {open.studentEmail}
                  </a>
                ) : null}
              </Detail>
              <Detail label="Phone">
                {open.studentPhone ? (
                  <a
                    href={`tel:${open.studentPhone}`}
                    className="inline-flex items-center gap-1.5 text-brand-700 hover:underline dark:text-brand-300"
                  >
                    <Phone className="size-3.5" aria-hidden="true" />
                    {open.studentPhone}
                  </a>
                ) : null}
              </Detail>
              <Detail label="Listing">
                {open.hostel ? (
                  <Link
                    href={`/admin/listings/${open.hostel._id}/edit`}
                    className="inline-flex items-center gap-1.5 text-brand-700 hover:underline dark:text-brand-300"
                  >
                    <Building2 className="size-3.5" aria-hidden="true" />
                    {open.hostel.name}
                  </Link>
                ) : (
                  'Deleted listing'
                )}
              </Detail>
              <Detail label="Room type">{open.roomType || '—'}</Detail>
              <Detail label="Move-in">
                {open.moveInDate ? formatDate(open.moveInDate) : 'Not specified'}
              </Detail>
              <Detail label="Duration">{open.durationMonths || 1} months</Detail>
              <Detail label="Message">{open.message || 'No message'}</Detail>
            </dl>

            <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-surface-sunken p-3">
              <Select
                label="Set status"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                hint="Confirming, rejecting or cancelling emails the student."
              >
                {BOOKING_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Note to the student"
                rows={3}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="A double room is free from 1 September."
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
