'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, RotateCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import AuthHeading from './AuthHeading';
import DevMailNotice from './DevMailNotice';
import OtpInput, { OTP_LENGTH } from './OtpInput';
import PasswordField from './PasswordField';
import PasswordStrength from './PasswordStrength';
import { useCountdown } from './useCountdown';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { codeIssue, passwordIssue } from './validation';

const RESEND_SECONDS = 60;
const PASSWORD_INPUT_ID = 'reset-new-password';

export default function ResetPasswordForm({ email, mailDelivered = true }) {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [delivered, setDelivered] = useState(mailDelivered);
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
      confirm: confirm === password ? '' : 'Both passwords must match',
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
      // Left disabled through the navigation — resubmitting would spend a code
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
    setDelivered(Boolean(data.delivered));
    setNotice(
      data.delivered
        ? `A new code is on its way to ${email}.`
        : 'A new code was generated — check the server console.'
    );
    setCode('');
    setEntryKey((k) => k + 1);
  }

  return (
    <div>
      <AuthHeading
        eyebrow="Password reset"
        icon={ShieldCheck}
        title="Choose a new password"
        description={
          <>
            Enter the {OTP_LENGTH}-digit code we sent to{' '}
            <span className="font-medium text-foreground">{email}</span>, then pick a new
            password.
          </>
        }
      />

      <DevMailNotice show={!delivered} className="mb-5" />

      {formError && (
        <Alert tone="danger" className="mb-5">
          {formError}
        </Alert>
      )}

      {notice && !formError && (
        <Alert tone="success" className="mb-5">
          {notice}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Verification code</p>
          <OtpInput
            key={entryKey}
            value={code}
            onChange={(next) => {
              setCode(next);
              if (errors.code) setErrors((p) => ({ ...p, code: '' }));
            }}
            // Six digits in means the code is done — move on to the password
            // rather than submitting a form that isn't filled in yet.
            onComplete={() => document.getElementById(PASSWORD_INPUT_ID)?.focus()}
            invalid={Boolean(errors.code)}
            disabled={submitting}
            autoFocus
            label="Password reset code"
          />
          {errors.code && (
            <p className="text-xs text-danger" role="alert">
              {errors.code}
            </p>
          )}
        </div>

        <div>
          <PasswordField
            id={PASSWORD_INPUT_ID}
            label="New password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
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
          {password && <PasswordStrength value={password} className="mt-3" />}
        </div>

        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (errors.confirm) setErrors((p) => ({ ...p, confirm: '' }));
          }}
          onBlur={() =>
            setErrors((p) => ({
              ...p,
              confirm: !confirm || confirm === password ? '' : 'Both passwords must match',
            }))
          }
          error={errors.confirm}
          disabled={submitting}
          required
        />

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Updating password…' : 'Update password'}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {cooling ? (
            <>
              Code not arrived? Resend in{' '}
              <span className="tabular font-semibold text-foreground">{remaining}s</span>
            </>
          ) : (
            'Code not arrived? Check spam, then resend.'
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

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Wrong address?{' '}
        <Link
          href="/forgot-password"
          className="cursor-pointer rounded-md font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:text-brand-200"
        >
          Start again
        </Link>
      </p>
    </div>
  );
}
