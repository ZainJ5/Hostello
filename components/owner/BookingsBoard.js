'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Inbox, Mail, MessageSquare, Phone, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Avatar, EmptyState, Spinner } from '@/components/ui/Feedback';
import { cn, formatDate, normalizePhone, timeAgo, whatsappLink } from '@/lib/utils';
import { Modal } from './Modal';
import RespondDialog from './BookingRespond';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Declined' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

/**
 * Booking requests for this owner's listings only — the query behind it is
 * scoped by `ownerId` server-side, and the listing filter can only ever narrow
 * that set further.
 */
export default function BookingsBoard({ bookings, hostels, counts, total, filters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detail, setDetail] = useState(null);
  const [respond, setRespond] = useState(null);

  function navigate(next) {
    const params = new URLSearchParams();
    const status = next.status ?? filters.status;
    const hostelId = next.hostelId ?? filters.hostelId;
    if (status && status !== 'all') params.set('status', status);
    if (hostelId && hostelId !== 'all') params.set('hostelId', hostelId);
    const query = params.toString();
    startTransition(() => router.push(`/owner/bookings${query ? `?${query}` : ''}`));
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          aria-label="Filter bookings by status"
        >
          {STATUS_TABS.map((tab) => {
            const active = filters.status === tab.key;
            const count = tab.key === 'all' ? total : counts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate({ status: tab.key })}
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
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {pending && <Spinner className="size-4 text-muted-foreground" />}
          <label className="sr-only" htmlFor="booking-listing-filter">
            Filter by listing
          </label>
          <select
            id="booking-listing-filter"
            value={filters.hostelId || 'all'}
            onChange={(e) => navigate({ hostelId: e.target.value })}
            className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none lg:w-64"
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

      {bookings.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={total === 0 ? 'No booking requests yet' : 'Nothing matches these filters'}
          description={
            total === 0
              ? 'When a student enquires about one of your listings, the request lands here and you can confirm it in one click.'
              : 'Try a different status or listing.'
          }
          action={
            total === 0 ? (
              <Button href="/owner/listings" variant="secondary">
                Check your listings
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate({ status: 'all', hostelId: 'all' })}>
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <caption className="sr-only">Booking requests for your listings</caption>
              <thead className="bg-surface-sunken">
                <tr className="text-left">
                  <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Listing</th>
                  <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Room</th>
                  <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Move-in</th>
                  <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">Requested</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="transition-colors duration-200 hover:bg-muted/50">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <button
                        type="button"
                        onClick={() => setDetail(booking)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Avatar name={booking.studentName} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground">
                            {booking.studentName || 'Unnamed student'}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {booking.studentEmail}
                          </span>
                        </span>
                      </button>
                    </th>
                    <td className="max-w-[200px] px-4 py-3">
                      <span className="block truncate text-foreground">{booking.hostelName}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {booking.roomType || 'Any'}
                      <span className="tabular block text-xs">
                        {booking.durationMonths} mo
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-muted-foreground">
                      {booking.moveInDate ? formatDate(booking.moveInDate) : 'Flexible'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{timeAgo(booking.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {booking.status === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setRespond({ booking, mode: 'confirmed' })}
                            >
                              <Check className="size-4" aria-hidden="true" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setRespond({ booking, mode: 'rejected' })}
                            >
                              <X className="size-4" aria-hidden="true" />
                              Decline
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => setDetail(booking)}>
                            Details
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {detail && (
        <Modal
          open
          onClose={() => setDetail(null)}
          title={detail.studentName || 'Booking request'}
          description={`${detail.hostelName} · requested ${timeAgo(detail.createdAt)}`}
          size="md"
          footer={
            detail.status === 'pending' ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRespond({ booking: detail, mode: 'rejected' });
                    setDetail(null);
                  }}
                >
                  Decline
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setRespond({ booking: detail, mode: 'confirmed' });
                    setDetail(null);
                  }}
                >
                  Confirm booking
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Close
              </Button>
            )
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={detail.status} />
              {detail.respondedAt && (
                <span className="text-xs text-muted-foreground">
                  answered {timeAgo(detail.respondedAt)}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-surface-sunken p-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Room type</dt>
                <dd className="font-medium text-foreground">{detail.roomType || 'Any'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Duration</dt>
                <dd className="tabular font-medium text-foreground">
                  {detail.durationMonths} month{detail.durationMonths === 1 ? '' : 's'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Move-in date</dt>
                <dd className="tabular font-medium text-foreground">
                  {detail.moveInDate ? formatDate(detail.moveInDate) : 'Flexible'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Requested</dt>
                <dd className="tabular font-medium text-foreground">
                  {formatDate(detail.createdAt)}
                </dd>
              </div>
            </dl>

            {detail.message && (
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MessageSquare className="size-3.5" aria-hidden="true" />
                  What the student said
                </p>
                <p className="rounded-xl border border-border p-3 text-sm text-foreground text-pretty">
                  {detail.message}
                </p>
              </div>
            )}

            {detail.ownerResponse && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Your reply</p>
                <p className="rounded-xl border border-border bg-surface-sunken p-3 text-sm text-foreground text-pretty">
                  {detail.ownerResponse}
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Contact details</p>
              <div className="flex flex-wrap gap-2">
                {detail.studentPhone && (
                  <Button
                    href={`tel:${normalizePhone(detail.studentPhone)}`}
                    variant="secondary"
                    size="sm"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {detail.studentPhone}
                  </Button>
                )}
                {detail.studentPhone && (
                  <Button
                    href={whatsappLink(
                      detail.studentPhone,
                      `Hello ${detail.studentName || ''}, about your request for ${detail.hostelName}`
                    )}
                    variant="secondary"
                    size="sm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </Button>
                )}
                {detail.studentEmail && (
                  <Button href={`mailto:${detail.studentEmail}`} variant="secondary" size="sm">
                    <Mail className="size-4" aria-hidden="true" />
                    {detail.studentEmail}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {respond && (
        <RespondDialog
          booking={respond.booking}
          mode={respond.mode}
          onClose={() => setRespond(null)}
        />
      )}
    </>
  );
}
