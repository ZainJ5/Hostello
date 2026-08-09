'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import AuthHeading from './AuthHeading';
import NotePanel from './NotePanel';
import OtpInput, { OTP_LENGTH } from './OtpInput';
import PasswordField from './PasswordField';
import PasswordStrength from './PasswordStrength';
import { useCountdown } from './useCountdown';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { codeIssue, passwordIssue } from './validation';

const RESEND_SECONDS = 60;
const PASSWORD_INPUT_ID = 'reset-new-password';

/**
 * The frame closes with a panel headed "Signing out everywhere", claiming a
 * reset ends every other session. It does not. The session is a self contained
 * JWT with no password version in it, so a token already issued to another
 * browser stays valid until it expires. The panel below says what actually
 * happens, because a security promise the code does not keep is worse than no
 * promise at all. If the client wants the promise, the token needs a version
 * claim checked on every request, which is a change to the auth stream.
 */
export default function ResetPasswordForm({ email }) {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [entryKey, setEntryKey] = useState(0);

  const { remaining, active: cooling, restart } = useCountdown(RESEND_SECONDS);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {
      code: codeIssue(code),
      password: passwordIssue(password),
      confirm: confirm === password ? '' : 'These two do not match. Check the second one.',
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setFormError('');
    setNotice('');
    setSubmitting(true);

    const { ok, status, data } = await apiRequest('/api/auth/reset-password', {
      body: { email, code, password },
    });

    if (ok) {
      // Left disabled through the navigation. Resubmitting would spend a code
      // that no longer exists and show a confusing error.
      router.replace('/login?reset=1');
      return;
    }

    setSubmitting(false);

    if (status === 422) {
      setErrors(fieldErrors(data));
      setFormError(data?.error || GENERIC_ERROR);
      return;
    }

    // A rejected code is the common case here, so clear the boxes for a retry.
    setCode('');
    setEntryKey((k) => k + 1);
    setFormError(data?.error || GENERIC_ERROR);
  }

  async function handleResend() {
    if (resending || cooling || submitting) return;

    setResending(true);
    setFormError('');
    setNotice('');

    const { ok, data } = await apiRequest('/api/auth/resend', {
      body: { email, purpose: 'reset' },
    });

    setResending(false);

    if (!ok) {
      setFormError(data?.error || GENERIC_ERROR);
      return;
    }

    restart(RESEND_SECONDS);
    setNotice(
      data.delivered
        ? `A new code is on its way to ${email}.`
        : 'A new code was created, but the email could not be sent. Please try again in a moment.'
    );
    setCode('');
    setEntryKey((k) => k + 1);
  }

  return (
    <div>
      <AuthHeading
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Sign in', href: '/login' },
          { label: 'Set a new password' },
        ]}
        title="Set a new password"
        description={
          <>
            Enter the six digit code we sent to{' '}
            <span className="ds-body-l text-ds-ink">{email}</span>, then choose a new
            password. The code lasts ten minutes.
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {formError ? (
          <Alert tone="error" title="That did not work">
            {formError}
          </Alert>
        ) : null}

        {notice && !formError ? <Alert title="Code sent">{notice}</Alert> : null}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <p className="ds-body-s-strong text-ds-ink">Reset code</p>
            <OtpInput
              key={entryKey}
              value={code}
              onChange={(next) => {
                setCode(next);
                if (errors.code) setErrors((p) => ({ ...p, code: '' }));
              }}
              // Six digits in means the code is done, so move on to the password
              // rather than submitting a form that isn't filled in yet.
              onComplete={() => document.getElementById(PASSWORD_INPUT_ID)?.focus()}
              invalid={Boolean(errors.code)}
              disabled={submitting}
              autoFocus
              label="Password reset code"
            />
            {errors.code ? (
              <p className="ds-body-s text-ds-error" role="alert">
                {errors.code}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <PasswordField
              id={PASSWORD_INPUT_ID}
              label="New password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              hint="Eight characters or more, with at least one letter and one number."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: '' }));
              }}
              onBlur={() => setErrors((p) => ({ ...p, password: passwordIssue(password) }))}
              error={errors.password}
              disabled={submitting}
              required
            />
            {password ? <PasswordStrength value={password} /> : null}
          </div>

          <PasswordField
            label="Type it again"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="The same password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (errors.confirm) setErrors((p) => ({ ...p, confirm: '' }));
            }}
            onBlur={() =>
              setErrors((p) => ({
                ...p,
                confirm:
                  !confirm || confirm === password
                    ? ''
                    : 'These two do not match. Check the second one.',
              }))
            }
            error={errors.confirm}
            disabled={submitting}
            required
          />

          <Button type="submit" loading={submitting} className="w-full">
            Save the new password
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
          <p className="sr-only" aria-live="polite">
            {cooling ? '' : 'You can request a new code now.'}
          </p>
        </div>

        <NotePanel title="What saving it does">
          <p>
            You are signed out in this browser and sent back to sign in, so the new
            password gets proved straight away.
          </p>
          <p>
            A browser you are already signed in on somewhere else stays signed in until
            that session runs out. Sign out from those devices as well if you think
            somebody else had your old password.
          </p>
        </NotePanel>

        <p className="ds-body-m text-ds-ink">
          Wrong address?{' '}
          <Link
            href="/forgot-password"
            className="text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Start again
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
