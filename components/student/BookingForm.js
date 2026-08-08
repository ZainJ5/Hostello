'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarCheck,
  CircleCheckBig,
  Clock,
  Compass,
  MapPin,
  Send,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { Alert, Rating } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Field';
import HostelImage from '@/components/ui/HostelImage';
import { formatDate, formatPKR } from '@/lib/utils';
import { DURATION_OPTIONS, ROOM_TYPES, formatDuration, todayInPK } from './constants';

/**
 * The booking request form.
 *
 * Room types come from the listing's own `rooms` array when it has one, so a
 * student can't request a Quad from a hostel that only has Singles; listings
 * with no room breakdown fall back to the standard vocabulary. The same
 * `todayInPK()` that the API validates against sets the date input's `min`, so
 * the two can never disagree about what "today" means.
 */
export default function BookingForm({ hostel, user }) {
  const router = useRouter();
  const rooms = hostel.rooms?.length ? hostel.rooms : null;
  const roomOptions = rooms ? rooms.map((r) => r.type) : ROOM_TYPES;

  const [form, setForm] = useState({
    roomType: roomOptions[0] || '',
    moveInDate: '',
    durationMonths: 6,
    phone: user.phone || '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const today = todayInPK();

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function validate() {
    const next = {};
    if (!form.moveInDate) next.moveInDate = 'Choose the date you want to move in';
    else if (form.moveInDate < today) next.moveInDate = 'Move-in date cannot be in the past';
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) {
      next.phone = 'Enter a number the hostel can reach you on';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setConflict(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostelId: hostel._id, ...form }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setConflict({ id: data.bookingId, status: data.bookingStatus, message: data.error });
        return;
      }
      if (res.status === 401) {
        router.push(`/login?next=/hostels/${hostel.slug}/book`);
        return;
      }
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(data.fieldErrors).map(([k, v]) => [k, v?.[0]])
            )
          );
        }
        throw new Error(data.error || 'Could not send your request');
      }

      setDone(data.booking);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-success-soft text-success dark:bg-success/15 dark:text-emerald-300">
            <CircleCheckBig className="size-8" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-h3 text-foreground">Request sent</h2>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            We&apos;ve emailed {hostel.name} your details. Owners usually reply within a
            day or two — you&apos;ll see their answer, and their phone number once they
            confirm, under My Bookings.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface-sunken p-4 text-left">
            <div>
              <dt className="text-xs text-muted-foreground">Room type</dt>
              <dd className="text-sm font-medium text-foreground">
                {done.roomType || 'Any'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Move-in</dt>
              <dd className="text-sm font-medium text-foreground">
                {formatDate(done.moveInDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Duration</dt>
              <dd className="text-sm font-medium text-foreground">
                {formatDuration(done.durationMonths)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="text-sm font-medium text-warning">Pending owner reply</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button href={`/dashboard/bookings?booking=${done._id}`} variant="primary">
              <CalendarCheck className="size-4" aria-hidden="true" />
              Track this request
            </Button>
            <Button href="/hostels" variant="secondary">
              <Compass className="size-4" aria-hidden="true" />
              Keep browsing
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <Card>
        <CardHeader
          title="Your request"
          description="The owner sees these details and replies by email or phone."
        />
        <CardBody>
          <form onSubmit={submit} className="space-y-5" noValidate>
            {error && (
              <Alert tone="danger" title="That didn't send">
                {error}
              </Alert>
            )}

            {conflict && (
              <Alert tone="warning" title="You already have a request here">
                <p className="text-pretty">{conflict.message}</p>
                <Link
                  href={
                    conflict.id
                      ? `/dashboard/bookings?booking=${conflict.id}`
                      : '/dashboard/bookings'
                  }
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 font-semibold underline underline-offset-2"
                >
                  Open that request
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input label="Your name" value={user.name} readOnly disabled />
              <Input label="Email" value={user.email} readOnly disabled />
            </div>

            <Select
              label="Room type"
              required
              value={form.roomType}
              onChange={(e) => set('roomType', e.target.value)}
              error={errors.roomType}
              hint={
                rooms
                  ? 'Only the room types this hostel lists.'
                  : 'This hostel has not published a room breakdown yet.'
              }
            >
              {roomOptions.map((type) => {
                const room = rooms?.find((r) => r.type === type);
                return (
                  <option key={type} value={type}>
                    {type}
                    {room?.price ? ` — ${formatPKR(room.price)}/month` : ''}
                    {room && room.available === 0 ? ' (waitlist)' : ''}
                  </option>
                );
              })}
            </Select>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Move-in date"
                type="date"
                required
                min={today}
                value={form.moveInDate}
                onChange={(e) => set('moveInDate', e.target.value)}
                error={errors.moveInDate}
              />
              <Select
                label="How long?"
                required
                value={form.durationMonths}
                onChange={(e) => set('durationMonths', Number(e.target.value))}
                error={errors.durationMonths}
              >
                {DURATION_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {formatDuration(n)}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              autoComplete="tel"
              placeholder="03xx xxxxxxx"
              hint="Shared with this owner only."
              error={errors.phone}
            />

            <Textarea
              label="Message to the owner"
              rows={5}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              maxLength={1000}
              placeholder="Tell them what you study, when you'd like to visit, and anything you need to check — meals, gate timing, attached bath…"
              hint={`${form.message.length}/1000 — optional, but a short note gets a faster reply.`}
              error={errors.message}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button href={`/hostels/${hostel.slug}`} variant="ghost">
                Back to listing
              </Button>
              <Button type="submit" variant="accent" size="lg" loading={saving}>
                <Send className="size-4" aria-hidden="true" />
                Send request
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <aside className="lg:sticky lg:top-24">
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/10] w-full">
            <HostelImage
              src={hostel.images?.[0]}
              name={hostel.name}
              alt={hostel.name}
              sizes="(max-width: 1024px) 100vw, 320px"
              priority
            />
          </div>
          <div className="p-5">
            <h2 className="text-base font-semibold text-foreground text-pretty">
              {hostel.name}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {[hostel.area, hostel.city].filter(Boolean).join(', ')}
            </p>
            {hostel.reviewCount > 0 && (
              <div className="mt-2.5">
                <Rating value={hostel.rating} count={hostel.reviewCount} size="sm" />
              </div>
            )}
            <p className="tabular mt-4 text-2xl font-bold text-foreground">
              {formatPKR(hostel.price)}
              <span className="text-sm font-normal text-muted-foreground"> /month</span>
            </p>
            {hostel.securityDeposit > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Plus {formatPKR(hostel.securityDeposit)} security deposit
              </p>
            )}
            <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground text-pretty">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Sending a request is free and does not commit you to anything. Nothing is
              paid through Hostello.
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
