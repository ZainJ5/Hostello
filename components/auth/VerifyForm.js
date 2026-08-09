'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import AuthHeading from './AuthHeading';
import NotePanel from './NotePanel';
import OtpInput, { OTP_LENGTH } from './OtpInput';
import { useCountdown } from './useCountdown';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { codeIssue, homeForRole } from './validation';

const RESEND_SECONDS = 60;

/**
 * The design frame for this screen offers "Carry on without verifying" and
 * describes verification as unlocking who is already in a room. Neither is
 * built: an unverified account cannot open a session at all, and occupancy is
 * not collected anywhere in the product. The secondary slot carries the resend
 * instead, which is the action a student on this screen actually needs, and
 * the panel says what verifying really does.
 *
 * The code itself never reaches the client, on any response, in any mode.
 */
export default function VerifyForm({ email, nextPath = '' }) {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // Bumped to remount the boxes after a failure, which clears them and takes focus.
  const [entryKey, setEntryKey] = useState(0);

  const { remaining, active: cooling, restart } = useCountdown(RESEND_SECONDS);

  // Guards the gap between "submit started" and the re-render that disables the
  // button. The auto-submit on the sixth digit and a fast Enter can otherwise
  // both read `submitting` as false and spend the code twice.
  const inFlight = useRef(false);

  function resetEntry() {
    setCode('');
    setEntryKey((k) => k + 1);
  }

  async function submit(submitted) {
    const value = submitted ?? code;
    if (inFlight.current) return;

    const issue = codeIssue(value);
    if (issue) {
      setError(issue);
      return;
    }

    inFlight.current = true;
    setError('');
    setNotice('');
    setSubmitting(true);

    const { ok, status, data } = await apiRequest('/api/auth/verify', {
      body: { email, code: value, purpose: 'signup' },
    });

    if (ok) {
      // Verification opens the session, so go straight to the destination.
      // Left in the submitting state deliberately while the route changes.
      router.replace(nextPath || data.redirect || homeForRole(data.user?.role));
      router.refresh();
      return;
    }

    inFlight.current = false;
    setSubmitting(false);
    resetEntry();
    setError(
      (status === 422 ? fieldErrors(data).code : '') || data?.error || GENERIC_ERROR
    );
  }

  async function handleResend() {
    if (resending || cooling || submitting) return;

    setResending(true);
    setError('');
    setNotice('');

    const { ok, data } = await apiRequest('/api/auth/resend', {
      body: { email, purpose: 'signup' },
    });

    setResending(false);

    if (!ok) {
      setError(data?.error || GENERIC_ERROR);
      return;
    }

    restart(RESEND_SECONDS);
    setNotice(
      data.delivered
        ? `A new code is on its way to ${email}.`
        : 'A new code was created, but the email could not be sent. Please try again in a moment.'
    );
    resetEntry();
  }

  return (
    <div>
      <AuthHeading
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Create an account', href: '/signup' },
          { label: 'Verify your email' },
        ]}
        title="Verify your email"
        description={
          <>
            We sent six digits to{' '}
            <span className="ds-body-l text-ds-ink">{email}</span>. It expires in ten
            minutes. Check the spam folder if it is not there.
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {error ? (
          <Alert tone="error" title="That code was not accepted">
            {error}
          </Alert>
        ) : null}

        {notice && !error ? <Alert title="Code sent">{notice}</Alert> : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <p className="ds-body-s-strong text-ds-ink" id="otp-label">
              Verification code
            </p>
            <OtpInput
              key={entryKey}
              value={code}
              onChange={setCode}
              onComplete={(full) => submit(full)}
              invalid={Boolean(error)}
              disabled={submitting}
              autoFocus
              label="Verification code"
              describedBy="otp-hint"
            />
            <p id="otp-hint" className="ds-body-s text-ds-ink-muted">
              Paste the whole code and every box fills in.
            </p>
          </div>

          <Button
            type="submit"
            loading={submitting}
            disabled={code.length !== OTP_LENGTH}
            className="w-full"
          >
            Verify
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleResend}
            loading={resending}
            disabled={cooling || submitting}
            className="w-full"
          >
            {cooling ? `Send it again in ${remaining}s` : 'Send it again'}
          </Button>
          {/* Announces the countdown ending without narrating every second. */}
          <p className="sr-only" aria-live="polite">
            {cooling ? '' : 'You can request a new code now.'}
          </p>
        </div>

        <NotePanel title="What verifying changes">
          <p>
            Until the address is confirmed the account cannot be signed in to, which is
            what stops somebody signing up with an address that is not theirs.
          </p>
          <p>
            Once it is confirmed you can save hostels to a shortlist and keep a record of
            the owners you contacted. Your email address is never shown to another student
            or to a hostel owner.
          </p>
        </NotePanel>

        <p className="ds-body-m text-ds-ink">
          Wrong address?{' '}
          <Link
            href="/signup"
            className="text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Sign up with a different email
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
