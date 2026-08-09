'use client';

import { useState } from 'react';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { ChoiceCard, ChoiceGroup, TextArea, TextField } from './Fields';
import { Callout } from './Blocks';
import { MIN_REPORT_DETAILS, REPORT_REASONS } from './report-reasons';

/**
 * Report a listing. Posts to `POST /api/reports`.
 *
 * No account required, and the form says so, because the student who was asked
 * for money before a visit has usually not signed up yet. The email field is
 * optional for the same reason: a report we can act on beats a report we can
 * reply to.
 *
 * Client validation only names the fix. The server is what enforces the rules,
 * and its field errors overwrite whatever this decided.
 */
export default function ReportListingForm({ hostel, signedIn }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [hostelName, setHostelName] = useState('');
  const [email, setEmail] = useState('');

  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  const needsName = !hostel;

  function validate() {
    const next = {};
    if (!reason) next.reason = 'Pick the thing that is wrong';
    if (details.trim().length < MIN_REPORT_DETAILS) {
      next.details = `At least ${MIN_REPORT_DETAILS} characters. What happened, and when?`;
    }
    if (needsName && !hostelName.trim()) {
      next.hostelName = 'Name the listing, or paste the link to it';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setSending(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostelSlug: hostel?.slug || '',
          hostelName: hostel?.name || hostelName,
          reason,
          details,
          reporterEmail: email,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(data.fieldErrors).map(([k, v]) => [k, v?.[0]])
            )
          );
        }
        throw new Error(data.error || 'Could not send that report');
      }

      setSent({ urgent: Boolean(data.urgent) });
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again, or email us instead.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert title="Report received">
          {sent.urgent
            ? 'This one is treated as urgent. A person reads it today, and the listing comes down while we check rather than after.'
            : 'A person reads this and checks the listing within a week. If it turns out to be a safety problem it moves to the same day queue.'}
        </Alert>
        <Callout title="The owner is never told who reported them">
          We tell an owner what was reported so they can answer it, never who reported it. If you
          are in immediate danger call 15 for police or 1122 for rescue. Hostello is a directory and
          cannot help in the moment.
        </Callout>
        <div className="flex flex-wrap gap-2">
          <Button href="/hostels" variant="secondary">
            Back to browsing
          </Button>
        </div>
      </div>
    );
  }

  const remaining = MIN_REPORT_DETAILS - details.trim().length;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {error ? (
        <Alert tone="error" title="That did not send">
          {error}
        </Alert>
      ) : null}

      {needsName ? (
        <TextField
          label="Which listing?"
          value={hostelName}
          onChange={(e) => setHostelName(e.target.value)}
          maxLength={200}
          placeholder="The hostel name, or paste the link to its page"
          hint="If you came here from a listing we fill this in for you."
          error={errors.hostelName}
        />
      ) : null}

      <ChoiceGroup legend="What is wrong?" error={errors.reason}>
        {REPORT_REASONS.map((r) => (
          <ChoiceCard
            key={r.value}
            name="reason"
            value={r.value}
            checked={reason === r.value}
            onChange={(v) => {
              setReason(v);
              setErrors((e) => (e.reason ? { ...e, reason: undefined } : e));
            }}
            title={r.label}
            note={r.note}
          />
        ))}
      </ChoiceGroup>

      <TextArea
        label="What happened"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="I called the number on the listing on 3 August. The man asked for the deposit before he would show me the room, and would not meet at the building."
        error={errors.details}
        hint={
          remaining > 0
            ? 'Dates, amounts and what was said are what let us act. We do not need your full name to act on a safety report.'
            : `${details.length} of 2000 characters`
        }
      />

      {!signedIn ? (
        <TextField
          label="Your email"
          type="email"
          optional
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          placeholder="you@example.com"
          hint="Only so we can come back to you if we need one more detail. It never reaches the hostel."
          error={errors.reporterEmail}
        />
      ) : null}

      <div>
        <Button type="submit" loading={sending}>
          Send this report
        </Button>
      </div>

      <Callout title="The owner is never told who reported them">
        We tell them what was reported so they can answer it, never who reported it. If you are in
        immediate danger call 15 for police or 1122 for rescue. Hostello is a directory and cannot
        help in the moment.
      </Callout>
    </form>
  );
}
