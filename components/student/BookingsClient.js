'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ban,
  CalendarCheck,
  Clock,
  Compass,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
} from 'lucide-react';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Alert, EmptyState } from '@/components/ui/Feedback';
import HostelImage from '@/components/ui/HostelImage';
import { cn, formatDate, normalizePhone, timeAgo, whatsappLink } from '@/lib/utils';
import { BOOKING_FILTERS, formatDuration } from './constants';
import Drawer from './Drawer';
import { useToast } from './Toast';

/**
 * All of a student's requests. The full list arrives from the server (a
 * student has tens of these, not thousands), so filtering is instant in
 * memory; the URL is kept in step with `router.replace` so a filtered view is
 * still shareable and survives a refresh.
 */
export default function BookingsClient({ bookings: initial, initialStatus = 'all', openId }) {
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

  const visible = useMemo(
    () => (status === 'all' ? bookings : bookings.filter((b) => b.status === status)),
    [bookings, status]
  );

  const detail = bookings.find((b) => b._id === detailId) || null;
  const confirmTarget = bookings.find((b) => b._id === confirmId) || null;

  function selectStatus(next) {
    setStatus(next);
    const qs = next === 'all' ? '' : `?status=${next}`;
    startTransition(() => router.replace(`/dashboard/bookings${qs}`, { scroll: false }));
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
      if (!res.ok) throw new Error(data.error || 'Could not cancel this request');

      if (data.booking) {
        setBookings((list) => list.map((b) => (b._id === booking._id ? data.booking : b)));
      }
      toast({
        tone: 'success',
        title: 'Request cancelled',
        description: `${booking.hostelId?.name || 'The hostel'} has been told you are no longer waiting.`,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      setBookings(before); // rollback
      toast({
        tone: 'danger',
        title: 'Could not cancel',
        description: err.message || 'Please try again in a moment.',
      });
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div
        role="group"
        aria-label="Filter by status"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {BOOKING_FILTERS.map((f) => {
          const active = status === f.value;
          const count = counts[f.value] || 0;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => selectStatus(f.value)}
              aria-pressed={active}
              className={cn(
                'inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium',
                'transition-[background-color,border-color,color] duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                active
                  ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                  : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              {f.label}
              <span
                className={cn(
                  'tabular rounded-md px-1.5 py-0.5 text-xs',
                  active ? 'bg-brand-600/15' : 'bg-muted'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={
            bookings.length === 0
              ? 'No booking requests yet'
              : `No ${status} requests`
          }
          description={
            bookings.length === 0
              ? 'Find a hostel you like and send the owner a request. Every reply lands here.'
              : 'Try another filter, or send a request to a hostel you have saved.'
          }
          action={
            bookings.length === 0 ? (
              <Button href="/hostels" variant="primary">
                <Compass className="size-4" aria-hidden="true" />
                Browse hostels
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => selectStatus('all')}>
                Show all requests
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-4">
          {visible.map((booking) => (
            <li key={booking._id}>
              <BookingRow
                booking={booking}
                busy={cancelling === booking._id}
                onOpen={() => setDetailId(booking._id)}
                onCancel={() => setConfirmId(booking._id)}
              />
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.hostelId?.name || 'Booking request'}
        description={
          detail ? `Requested ${timeAgo(detail.createdAt)} · ${detail.status}` : undefined
        }
        size="md"
        footer={
          detail ? (
            <div className="flex flex-wrap items-center gap-2">
              {detail.hostelId?.slug && (
                <Button href={`/hostels/${detail.hostelId.slug}`} variant="secondary" size="md">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  View listing
                </Button>
              )}
              {detail.status === 'pending' && (
                <Button
                  variant="danger"
                  size="md"
                  loading={cancelling === detail._id}
                  onClick={() => setConfirmId(detail._id)}
                >
                  <Ban className="size-4" aria-hidden="true" />
                  Cancel request
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {detail && <BookingDetail booking={detail} />}
      </Drawer>

      <Drawer
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmId(null)}
        title="Cancel this request?"
        description="The owner will see that you are no longer waiting for a reply."
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>
              Keep waiting
            </Button>
            <Button
              variant="danger"
              loading={cancelling === confirmTarget?._id}
              onClick={() => confirmTarget && cancelBooking(confirmTarget)}
            >
              Cancel request
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground text-pretty">
          You can always send {confirmTarget?.hostelId?.name || 'this hostel'} a fresh request
          later. Cancelling only withdraws this one.
        </p>
      </Drawer>
    </div>
  );
}

function BookingRow({ booking, busy, onOpen, onCancel }) {
  const hostel = booking.hostelId;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl sm:size-24">
          <HostelImage
            src={hostel?.images?.[0]}
            name={hostel?.name}
            alt={hostel?.name || 'Hostel'}
            sizes="(max-width: 640px) 100vw, 96px"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              {hostel?.slug ? (
                <Link
                  href={`/hostels/${hostel.slug}`}
                  className="cursor-pointer text-base font-semibold text-foreground transition-colors duration-200 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand-400"
                >
                  {hostel.name}
                </Link>
              ) : (
                <p className="text-base font-semibold text-foreground">Listing removed</p>
              )}
              {(hostel?.area || hostel?.city) && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  {[hostel.area, hostel.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Fact label="Room type" value={booking.roomType || 'Any'} />
            <Fact
              label="Move-in"
              value={booking.moveInDate ? formatDate(booking.moveInDate) : 'Not set'}
            />
            <Fact label="Duration" value={formatDuration(booking.durationMonths)} />
          </dl>

          {booking.ownerResponse && (
            <div className="mt-3 rounded-xl border border-border bg-surface-sunken p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MessageSquareText className="size-3.5" aria-hidden="true" />
                Owner replied
                {booking.respondedAt && (
                  <span className="font-normal text-muted-foreground">
                    {timeAgo(booking.respondedAt)}
                  </span>
                )}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground text-pretty">
                {booking.ownerResponse}
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onOpen}>
              View details
            </Button>
            {booking.status === 'pending' && (
              <Button variant="ghost" size="sm" loading={busy} onClick={onCancel}>
                <Ban className="size-4" aria-hidden="true" />
                Cancel request
              </Button>
            )}
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden="true" />
              Sent {timeAgo(booking.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function BookingDetail({ booking }) {
  const hostel = booking.hostelId;
  const contact = hostel?.contact;
  const phone = normalizePhone(contact?.phone);
  const wa = whatsappLink(
    contact?.whatsapp || contact?.phone,
    `Hi, I'm ${booking.studentName}. I sent a booking request for ${hostel?.name || 'your hostel'} on Hostello.`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
          <HostelImage
            src={hostel?.images?.[0]}
            name={hostel?.name}
            alt={hostel?.name || 'Hostel'}
            sizes="64px"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {hostel?.name || 'Listing removed'}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[hostel?.area, hostel?.city].filter(Boolean).join(', ')}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface-sunken p-4">
        <Fact label="Status" value={booking.status} />
        <Fact label="Room type" value={booking.roomType || 'Any'} />
        <Fact
          label="Move-in"
          value={booking.moveInDate ? formatDate(booking.moveInDate) : 'Not set'}
        />
        <Fact label="Duration" value={formatDuration(booking.durationMonths)} />
        <Fact label="Your name" value={booking.studentName || 'Not given'} />
        <Fact label="Your number" value={booking.studentPhone || 'Not given'} />
      </dl>

      <section aria-label="Message thread" className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Conversation</h3>

        <div className="rounded-xl rounded-tl-sm border border-border bg-surface p-3.5">
          <p className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">You</span>
            <span className="text-muted-foreground">{timeAgo(booking.createdAt)}</span>
          </p>
          <p className="mt-1.5 text-sm text-foreground text-pretty">
            {booking.message || (
              <span className="text-muted-foreground italic">
                No message. Just the request details above.
              </span>
            )}
          </p>
        </div>

        {booking.ownerResponse ? (
          <div className="ml-6 rounded-xl rounded-tr-sm border border-brand-200 bg-brand-50 p-3.5 dark:border-brand-900 dark:bg-brand-950/50">
            <p className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-brand-900 dark:text-brand-200">
                {hostel?.name || 'The owner'}
              </span>
              <span className="text-brand-800/70 dark:text-brand-300/70">
                {booking.respondedAt ? timeAgo(booking.respondedAt) : ''}
              </span>
            </p>
            <p className="mt-1.5 text-sm text-brand-900 text-pretty dark:text-brand-100">
              {booking.ownerResponse}
            </p>
          </div>
        ) : booking.status === 'pending' ? (
          <p className="flex items-center gap-2 pl-1 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            Waiting for the owner to reply. Most respond within a day or two.
          </p>
        ) : null}
      </section>

      {booking.status === 'confirmed' ? (
        <section aria-label="Hostel contact" className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Hostel contact
            <Badge tone="success" size="sm" className="ml-2">
              Unlocked
            </Badge>
          </h3>
          {contact?.name && (
            <p className="text-sm text-muted-foreground">Ask for {contact.name}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {phone && (
              <Button href={`tel:${phone}`} variant="secondary" size="sm">
                <Phone className="size-4" aria-hidden="true" />
                {phone}
              </Button>
            )}
            {wa && (
              <Button
                href={wa}
                variant="secondary"
                size="sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquareText className="size-4" aria-hidden="true" />
                WhatsApp
              </Button>
            )}
            {contact?.email && (
              <Button href={`mailto:${contact.email}`} variant="secondary" size="sm">
                <Mail className="size-4" aria-hidden="true" />
                Email
              </Button>
            )}
          </div>
          {!phone && !contact?.email && !wa && (
            <p className="text-sm text-muted-foreground">
              This owner has not published contact details yet.
            </p>
          )}
        </section>
      ) : (
        <Alert tone="info" title="Contact details are shared on confirmation">
          Once the owner confirms your request, their phone number, WhatsApp and email
          appear here.
        </Alert>
      )}
    </div>
  );
}
