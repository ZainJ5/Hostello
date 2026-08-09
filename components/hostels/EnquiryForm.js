'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { cn, normalizePhone, whatsappLink } from '@/lib/utils';
import { Input, Select, Textarea } from './Field';
import ShareButton from './ShareButton';
import { trackContact } from './ContactActions';
import { DURATION_OPTIONS, formatDuration, todayInPK } from '@/components/student/constants';

/**
 * Figma page/enquire 79:1343, the routes column.
 *
 * WORDING. Everything a student reads says enquiry. The Mongo collection, the
 * models and the API route are still `booking` and are not renamed: the path
 * is not user visible and a parallel surface would be two things to maintain
 * for no gain.
 *
 * ORDER. The phone comes first and the form comes last, which inverts the
 * live site. A call reaches a warden in seconds and 104 of 124 listings carry
 * a number, so putting a form above it would be putting the slower route in
 * front of the faster one for the sake of a database row.
 *
 * WHAT THE FORM HONESTLY DOES. It records the enquiry against the student's
 * account and shows it under Saved and enquiries. The design describes it as
 * leaving "a written record on both sides", and that overstates it: no listing
 * in the directory has an owner account or a contact email yet, so the copy
 * here promises the student's own record and nothing about the owner's.
 */

function Route({ title, body, children }) {
  return (
    <section className="ds-elevated flex w-full flex-col gap-2 rounded-ds-inner p-4">
      <h3 className="ds-body-m-strong text-ds-ink">{title}</h3>
      <p className="ds-body-s max-w-[85ch] text-pretty text-ds-ink-muted">{body}</p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

export default function EnquiryForm({ hostel, user, existing, className }) {
  const router = useRouter();
  const rooms = hostel.rooms?.length ? hostel.rooms : null;

  const [form, setForm] = useState({
    roomType: rooms ? rooms[0].type : '',
    moveInDate: '',
    durationMonths: 6,
    phone: user?.phone || '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const today = todayInPK();
  const tel = normalizePhone(hostel.contact?.phone);
  const wa = whatsappLink(
    hostel.contact?.whatsapp || hostel.contact?.phone,
    `Hello, I found ${hostel.name} on Hostello and I would like to ask about a room.`
  );
  const where = [hostel.area, hostel.city].filter(Boolean).join(', ') || hostel.city;
  const signedIn = Boolean(user);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function validate() {
    const next = {};
    if (!form.moveInDate) next.moveInDate = 'Choose the date you want to move in';
    else if (form.moveInDate < today) next.moveInDate = 'That date has already passed';
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) {
      next.phone = 'Enter a number the hostel can reach you on';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostelId: hostel._id, ...form }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/hostels/${hostel.slug}/enquire`)}`);
        return;
      }
      if (res.status === 409) {
        setError(data.error || 'You already have an enquiry with this hostel.');
        return;
      }
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors(
            Object.fromEntries(Object.entries(data.fieldErrors).map(([k, v]) => [k, v?.[0]]))
          );
        }
        throw new Error(data.error || 'Could not send your enquiry');
      }

      setDone(data.booking);
      router.refresh();
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Sent. Figma page/enquiry-sent 79:1587 ──
  if (done) {
    return (
      <div className={cn('flex w-full flex-col gap-6', className)}>
        <div className="flex flex-col gap-2">
          <h2 className="ds-display-m text-ds-ink">Enquiry sent</h2>
          <p className="ds-body-m max-w-[80ch] text-pretty text-ds-ink-muted">
            It is recorded against your account and you can open it any time under Saved and
            enquiries. Hostello holds no rooms, so nothing is reserved and nothing is paid.
            {tel ? ' If you need an answer today, call the number above.' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button href="/account/enquiries">Open my enquiries</Button>
          <Button href={`/hostels/${hostel.slug}`} variant="secondary">
            Back to the listing
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="ds-display-s text-ds-ink">While you wait</h3>

          <Route
            title="Send this to your family"
            body="In most households the person who decides is a parent, and the way it reaches them is WhatsApp. This sends them the listing with the address, the rent and the number."
          >
            <ShareButton title={hostel.name} text={`${hostel.name}, ${where}`} />
          </Route>

          <Route
            title="Ask the people who live there"
            body="Anyone can ask a question on a listing, and the students living there are the ones who answer it. Water pressure, gate timing and what the mess is like at the weekend are the three that catch people out."
          >
            <Button href={`/hostels/${hostel.slug}/ask`} variant="secondary" className="w-full">
              Ask a question
            </Button>
          </Route>

          <Route
            title="Look at two more before you decide"
            body="One hostel is not a comparison. Two more in the same area takes ten minutes and is the difference between choosing and settling."
          >
            <Button
              href={`/hostels?city=${encodeURIComponent(hostel.city)}`}
              variant="secondary"
              className="w-full"
            >
              More hostels in {hostel.city}
            </Button>
          </Route>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full flex-col gap-4', className)}>
      <h2 className="ds-display-s text-ds-ink">
        {tel || wa ? 'Three ways, all of them straight to the hostel' : 'One way to reach this hostel'}
      </h2>

      {tel ? (
        <Route
          title="Call the hostel"
          body={`${hostel.contact.phone}. This is the hostel's own number, answered by the warden or the owner, not an agent. Best between 10am and 8pm.`}
        >
          <Button
            href={`tel:${tel}`}
            className="w-full"
            onClick={() => trackContact(hostel.slug, 'call')}
          >
            Call now
          </Button>
        </Route>
      ) : null}

      {wa ? (
        <Route
          title={`WhatsApp ${hostel.name}`}
          body="Opens WhatsApp to the hostel's own number with a message already written, saying which listing you found and where. This is not Hostello support."
        >
          <Button
            href={wa}
            variant="secondary"
            className="w-full"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContact(hostel.slug, 'whatsapp')}
          >
            Open WhatsApp to the hostel
          </Button>
        </Route>
      ) : null}

      {!tel && !wa ? (
        <Alert title="This listing carries no phone number">
          The owner has not given Hostello a number, so the form below is the only route to them
          from here. Twenty of the 124 listings are in the same position.
        </Alert>
      ) : null}

      {/* ── Message through Hostello ── */}
      <section className="ds-elevated flex w-full flex-col gap-4 rounded-ds-inner p-4">
        <div className="flex flex-col gap-2">
          <h3 className="ds-body-m-strong text-ds-ink">Message through Hostello</h3>
          <p className="ds-body-s max-w-[85ch] text-pretty text-ds-ink-muted">
            Slower than a call. It records the enquiry against your account so you can keep track
            of who you have spoken to, and it sends the hostel your name, your number and
            whatever you write.
          </p>
        </div>

        {existing ? (
          <Alert title="You already have an enquiry with this hostel">
            <p>
              Sending a second one asks the owner for a decision they have already been asked for.
            </p>
            <Link
              href="/account/enquiries"
              className="ds-body-m-strong mt-2 inline-flex text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
            >
              Open the one you already sent
            </Link>
          </Alert>
        ) : !signedIn ? (
          <div className="flex flex-col gap-3">
            <p className="ds-body-s text-ds-ink-muted">
              This route needs an account, because the enquiry is kept for you rather than sent
              and forgotten. Calling and WhatsApp need nothing.
            </p>
            <Button
              href={`/login?next=${encodeURIComponent(`/hostels/${hostel.slug}/enquire`)}`}
              variant="secondary"
              className="w-full"
            >
              Sign in to send a message
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
            {error ? (
              <Alert tone="error" title="That did not send">
                {error}
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Your name" value={user.name} readOnly disabled />
              <Input label="Email" value={user.email} readOnly disabled />
            </div>

            {/* The room type select appears only when the owner has recorded
                room types. No listing has yet, and asking a student to pick
                from a vocabulary the hostel never published is asking them to
                guess. */}
            {rooms ? (
              <Select
                label="Room type"
                value={form.roomType}
                onChange={(e) => set('roomType', e.target.value)}
                error={errors.roomType}
              >
                {rooms.map((r) => (
                  <option key={r.type} value={r.type}>
                    {r.type}
                  </option>
                ))}
              </Select>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Move in date"
                type="date"
                required
                min={today}
                value={form.moveInDate}
                onChange={(e) => set('moveInDate', e.target.value)}
                error={errors.moveInDate}
              />
              <Select
                label="How long"
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
              autoComplete="tel"
              placeholder="03xx xxxxxxx"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              hint="Shared with this hostel only."
              error={errors.phone}
            />

            <Textarea
              label="Anything the hostel should know"
              rows={4}
              maxLength={1000}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="What you study, when you could visit, and anything you need to check: gate timing, mess, attached bath."
              hint={`${form.message.length} of 1000. Optional, and a short note gets a faster reply.`}
              error={errors.message}
            />

            <Button type="submit" loading={saving} className="w-full sm:w-auto sm:self-start">
              Send enquiry
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
