'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ds/Badge';
import Button from '@/components/ds/Button';
import FilterChip from '@/components/ds/FilterChip';
import { Alert, EmptyState } from '@/components/ds/Feedback';
import { formatDate, normalizePhone, timeAgo, whatsappLink } from '@/lib/utils';
import { BOOKING_FILTERS, formatDuration } from './constants';
import Drawer from './Drawer';
import { useToast } from './Toast';

/**
 * Every enquiry a student has sent.
 *
 * "Enquiry" is the only word used here. The collection, the model and the API
 * route are all still `booking`, which is why the props and the fetches below
 * say booking and the copy never does.
 *
 * The full list arrives from the server, since a student has tens of these and
 * not thousands, so filtering is instant in memory. The URL is kept in step
 * with `router.replace` so a filtered view survives a refresh and can be
 * shared.
 *
 * The frame draws a flat list with no filters. The filters are kept, because
 * status here is real recorded data with five values and a student with a
 * dozen enquiries needs to find the one that was confirmed. Only the statuses
 * that actually occur get a chip, so the rail can never show a row of zeroes.
 */
export default function EnquiriesClient({ bookings: initial, initialStatus = 'all', openId }) {
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState(initial);
  const [status, setStatus] = useState(initialStatus);
  const [detailId, setDetailId] = useState(openId || null);
  const [cancelling, setCancelling] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const map = { all: bookings.length };
    for (const b of bookings) map[b.status] = (map[b.status] || 0) + 1;
    return map;
  }, [bookings]);

  const filters = useMemo(
    () => BOOKING_FILTERS.filter((f) => f.value === 'all' || counts[f.value] > 0),
    [counts]
  );

  const visible = useMemo(
    () => (status === 'all' ? bookings : bookings.filter((b) => b.status === status)),
    [bookings, status]
  );

  const detail = bookings.find((b) => b._id === detailId) || null;
  const confirmTarget = bookings.find((b) => b._id === confirmId) || null;

  function selectStatus(next) {
    setStatus(next);
    const qs = next === 'all' ? '' : `?status=${next}`;
    startTransition(() => router.replace(`/account/enquiries${qs}`, { scroll: false }));
  }

  async function cancelBooking(booking) {
    setConfirmId(null);
    setCancelling(booking._id);

    const before = bookings;
    // Optimistic: the row flips to cancelled immediately.
    setBookings((list) =>
      list.map((b) => (b._id === booking._id ? { ...b, status: 'cancelled' } : b))
    );

    try {
      const res = await fetch(`/api/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not withdraw this enquiry');

      if (data.booking) {
        setBookings((list) => list.map((b) => (b._id === booking._id ? data.booking : b)));
      }
      toast({
        tone: 'success',
        title: 'Enquiry withdrawn',
        description: `${booking.hostelId?.name || 'The hostel'} has been told you are no longer waiting.`,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      setBookings(before); // rollback
      toast({
        tone: 'danger',
        title: 'Could not withdraw it',
        description: err.message || 'Please try again in a moment.',
      });
    } finally {
      setCancelling(null);
    }
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="You have not sent an enquiry yet"
        body="Find a hostel you like, send the owner an enquiry from its listing, and this page keeps the record: who you contacted, when, and what they said back."
        action={<Button href="/hostels">Browse hostels</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {filters.length > 2 ? (
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <FilterChip
              key={f.value}
              selected={status === f.value}
              count={counts[f.value] || 0}
              onClick={() => selectStatus(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={`No ${status} enquiries`}
          body="Nothing is in this state right now. Try another filter."
          action={
            <Button variant="secondary" onClick={() => selectStatus('all')}>
              Show every enquiry
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((booking) => (
            <li key={booking._id}>
              <EnquiryRow
                booking={booking}
                busy={cancelling === booking._id}
                onOpen={() => setDetailId(booking._id)}
                onCancel={() => setConfirmId(booking._id)}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="ds-body-s text-ds-ink-muted">
        No reply after two weeks usually means the room went. Calling gets an answer more
        often than a message does, because wardens answer the phone more than they read
        WhatsApp.
      </p>

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.hostelId?.name || 'Enquiry'}
        description={detail ? `Sent ${timeAgo(detail.createdAt)}` : undefined}
        size="md"
        footer={
          detail ? (
            <div className="flex flex-wrap items-center gap-2">
              {detail.hostelId?.slug ? (
                <Button href={`/hostels/${detail.hostelId.slug}`} variant="secondary">
                  View listing
                </Button>
              ) : null}
              {detail.status === 'pending' ? (
                <Button
                  variant="secondary"
                  loading={cancelling === detail._id}
                  onClick={() => setConfirmId(detail._id)}
                >
                  Withdraw
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {detail ? <EnquiryDetail booking={detail} /> : null}
      </Drawer>

      <Drawer
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmId(null)}
        title="Withdraw this enquiry?"
        description="The owner will see that you are no longer waiting for a reply."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Keep waiting
            </Button>
            <Button
              loading={cancelling === confirmTarget?._id}
              onClick={() => confirmTarget && cancelBooking(confirmTarget)}
            >
              Withdraw it
            </Button>
          </div>
        }
      >
        <p className="ds-body-m text-pretty text-ds-ink-muted">
          You can send {confirmTarget?.hostelId?.name || 'this hostel'} a fresh enquiry
          later. Withdrawing only takes back this one.
        </p>
      </Drawer>
    </div>
  );
}

/** What each status means, in words, because the badge alone is not a sentence. */
const STATUS_LINE = {
  pending: 'Sent through Hostello. Waiting on a reply.',
  confirmed: 'The owner confirmed you. Their number is in the details.',
  rejected: 'The owner said no. The room had probably gone.',
  cancelled: 'You withdrew this one.',
  completed: 'The stay is finished.',
};

function EnquiryRow({ booking, busy, onOpen, onCancel }) {
  const hostel = booking.hostelId;
  const reviewable = booking.status === 'confirmed' || booking.status === 'completed';

  return (
    <article className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h2 className="ds-display-s min-w-0 text-ds-ink">
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
        </h2>
        <p className="ds-mono-meta shrink-0 pt-1 text-ds-ink-muted">
          {timeAgo(booking.createdAt)}
        </p>
      </div>

      <p className="ds-body-s text-ds-ink-muted">
        {STATUS_LINE[booking.status] || booking.status}
      </p>

      {booking.ownerResponse ? (
        <p className="ds-body-s line-clamp-2 text-pretty text-ds-ink">
          <span className="ds-body-s-strong">They said: </span>
          {booking.ownerResponse}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="secondary" onClick={onOpen} className="sm:flex-1">
          What you sent
        </Button>
        {reviewable ? (
          <Button href="/account/reviews" variant="secondary" className="sm:flex-1">
            Write a review
          </Button>
        ) : null}
        {booking.status === 'pending' ? (
          <Button variant="secondary" loading={busy} onClick={onCancel} className="sm:flex-1">
            Withdraw
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="ds-body-s text-ds-ink-muted">{label}</dt>
      <dd className="ds-body-m-strong truncate text-ds-ink">{value}</dd>
    </div>
  );
}

function EnquiryDetail({ booking }) {
  const hostel = booking.hostelId;
  const contact = hostel?.contact;
  const phone = normalizePhone(contact?.phone);
  const wa = whatsappLink(
    contact?.whatsapp || contact?.phone,
    `Hi, I'm ${booking.studentName}. I sent an enquiry about ${hostel?.name || 'your hostel'} on Hostello.`
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Badge variant={booking.status === 'confirmed' ? 'solid' : 'outline'}>
          {booking.status}
        </Badge>
        <p className="ds-body-s text-ds-ink-muted">
          {[hostel?.area, hostel?.city].filter(Boolean).join(', ')}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-ds-inner border border-solid border-ds-hairline bg-ds-surface-sunken p-4">
        <Fact label="Room type" value={booking.roomType || 'Any'} />
        <Fact
          label="Move in"
          value={booking.moveInDate ? formatDate(booking.moveInDate) : 'Not set'}
        />
        <Fact label="Length of stay" value={formatDuration(booking.durationMonths)} />
        <Fact label="Your number" value={booking.studentPhone || 'Not given'} />
      </dl>

      <section aria-label="What was said" className="flex flex-col gap-3">
        <h3 className="ds-body-m-strong text-ds-ink">What was said</h3>

        <div className="rounded-ds-inner border border-solid border-ds-hairline p-4">
          <p className="ds-body-s flex items-center justify-between gap-2 text-ds-ink-muted">
            <span className="ds-body-s-strong text-ds-ink">You</span>
            <span>{timeAgo(booking.createdAt)}</span>
          </p>
          <p className="ds-body-m mt-2 text-pretty text-ds-ink">
            {booking.message || 'No message. Just the details above.'}
          </p>
        </div>

        {booking.ownerResponse ? (
          <div className="rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-sunken p-4">
            <p className="ds-body-s flex items-center justify-between gap-2 text-ds-ink-muted">
              <span className="ds-body-s-strong text-ds-ink">
                {hostel?.name || 'The owner'}
              </span>
              <span>{booking.respondedAt ? timeAgo(booking.respondedAt) : ''}</span>
            </p>
            <p className="ds-body-m mt-2 text-pretty text-ds-ink">{booking.ownerResponse}</p>
          </div>
        ) : booking.status === 'pending' ? (
          <p className="ds-body-s text-ds-ink-muted">
            Nothing back yet. Most owners answer within a day or two, and a phone call
            gets an answer sooner than a message.
          </p>
        ) : null}
      </section>

      {booking.status === 'confirmed' ? (
        <section aria-label="Hostel contact" className="flex flex-col gap-3">
          <h3 className="ds-body-m-strong text-ds-ink">Their contact details</h3>
          {contact?.name ? (
            <p className="ds-body-s text-ds-ink-muted">Ask for {contact.name}</p>
          ) : null}
          {phone || wa ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {phone ? (
                <Button href={`tel:${phone}`} variant="secondary">
                  {phone}
                </Button>
              ) : null}
              {wa ? (
                <Button
                  href={wa}
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="ds-body-s text-ds-ink-muted">
              This owner has published no phone number, so there is nothing to show here.
              The listing page is the only route in.
            </p>
          )}
        </section>
      ) : (
        <Alert title="Contact details arrive with the confirmation">
          Once the owner confirms, their phone number and WhatsApp appear here.
        </Alert>
      )}
    </div>
  );
}
