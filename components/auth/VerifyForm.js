'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, RotateCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import AuthHeading from './AuthHeading';
import DevMailNotice from './DevMailNotice';
import OtpInput, { OTP_LENGTH } from './OtpInput';
import { useCountdown } from './useCountdown';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { codeIssue, homeForRole } from './validation';

const RESEND_SECONDS = 60;

/**
 * The screen every new account passes through, so it is built to be finished
 * in one motion: the boxes take focus on load, a pasted code fills all six and
 * submits itself, and the resend button says exactly how long the wait is.
 */
export default function VerifyForm({ email, nextPath = '', mailDelivered = true }) {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [delivered, setDelivered] = useState(mailDelivered);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // Bumped to remount the boxes after a failure — clears them and takes focus.
  const [entryKey, setEntryKey] = useState(0);

  const { remaining, active: cooling, restart } = useCountdown(RESEND_SECONDS);

  // Guards the gap between "submit started" and the re-render that disables the
  // button — the auto-submit on the sixth digit and a fast Enter can otherwise
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
    setDelivered(Boolean(data.delivered));
    setNotice(
      data.delivered
        ? `A new code is on its way to ${email}.`
        : 'A new code was generated — check the server console.'
    );
    resetEntry();
  }

  return (
    <div>
      <AuthHeading
        eyebrow="One last step"
        icon={Mail}
        title="Check your email"
        description={
          <>
            We sent a {OTP_LENGTH}-digit code to{' '}
            <span className="font-medium text-foreground">{email}</span>. It expires in
            10 minutes.
          </>
        }
      />

      <DevMailNotice show={!delivered} className="mb-5" />

      {error && (
        <Alert tone="danger" className="mb-5">
          {error}
        </Alert>
      )}

      {notice && !error && (
        <Alert tone="success" className="mb-5">
          {notice}
        </Alert>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
        className="space-y-5"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Verification code</p>
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
          <p id="otp-hint" className="text-xs text-muted-foreground">
            Paste the whole code and every box fills in.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          disabled={code.length !== OTP_LENGTH}
          className="w-full"
        >
          {submitting ? 'Verifying…' : 'Verify and continue'}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {cooling ? (
            <>
              Didn&apos;t get it? You can resend in{' '}
              <span className="tabular font-semibold text-foreground">{remaining}s</span>
            </>
          ) : (
            "Didn't get the email? Check spam, then resend."
          )}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={handleResend}
          loading={resending}
          disabled={cooling || submitting}
          className="shrink-0"
        >
          {!resending && <RotateCw className="size-4" aria-hidden="true" />}
          {cooling ? (
            <>
              Resend in <span className="tabular">{remaining}s</span>
            </>
          ) : (
            'Resend code'
          )}
        </Button>
      </div>

      {/* Announces the countdown ending without narrating every second. */}
      <p className="sr-only" aria-live="polite">
        {cooling ? '' : 'You can request a new code now.'}
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Wrong address?{' '}
        <Link
          href="/signup"
          className="cursor-pointer rounded-md font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:text-brand-200"
        >
          Sign up with a different email
        </Link>
      </p>
    </div>
  );
}
