'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import AuthHeading from './AuthHeading';
import NotePanel from './NotePanel';
import PasswordField from './PasswordField';
import { TextInput } from './Field';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { emailIssue, homeForRole } from './validation';

export default function LoginForm({ nextPath = '', passwordWasReset = false }) {
  const router = useRouter();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const signupHref = nextPath
    ? `/signup?next=${encodeURIComponent(nextPath)}`
    : '/signup';

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {
      email: emailIssue(values.email),
      password: values.password ? '' : 'Enter your password',
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    setFormError('');
    setSubmitting(true);

    const { ok, status, data } = await apiRequest('/api/auth/login', {
      body: { email: values.email.trim(), password: values.password },
    });

    if (ok) {
      // Deliberately stay in the submitting state: the navigation is already
      // under way and re-enabling the button would invite a second POST.
      router.replace(nextPath || data.redirect || homeForRole(data.user?.role));
      router.refresh();
      return;
    }

    setSubmitting(false);

    // The account exists but has never confirmed its address, so send them to
    // the screen that can fix it instead of showing a dead end.
    if (data?.code === 'EMAIL_NOT_VERIFIED') {
      const query = new URLSearchParams({ email: data.email, purpose: 'signup' });
      if (nextPath) query.set('next', nextPath);
      router.push(`/verify?${query.toString()}`);
      return;
    }

    if (status === 422) {
      setErrors(fieldErrors(data));
      setFormError(data?.error || GENERIC_ERROR);
      return;
    }

    setFormError(data?.error || GENERIC_ERROR);
  }

  return (
    <div>
      <AuthHeading
        trail={[{ label: 'Home', href: '/' }, { label: 'Sign in' }]}
        title="Sign in to Hostello"
        description="Your saved hostels and the enquiries you have already sent are waiting here."
      />

      <div className="flex flex-col gap-5">
        {passwordWasReset ? (
          <Alert title="Password updated">Sign in with your new password.</Alert>
        ) : null}

        {nextPath && !passwordWasReset ? (
          <Alert>
            Sign in to continue to <span className="ds-body-m-strong text-ds-ink">{nextPath}</span>.
          </Alert>
        ) : null}

        {formError ? (
          <Alert tone="error" title="That did not work">
            {formError}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <TextInput
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            hint="Your university address if you have one. A personal address works too."
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => setErrors((p) => ({ ...p, email: emailIssue(values.email) }))}
            error={errors.email}
            disabled={submitting}
            required
          />

          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            hint="Forgot it? Use the link below and we will email you a reset code."
            value={values.password}
            onChange={(e) => setField('password', e.target.value)}
            error={errors.password}
            disabled={submitting}
            required
          />

          <Button type="submit" loading={submitting} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="ds-body-m">
          <Link
            href="/forgot-password"
            className="text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Forgot your password
          </Link>
        </p>

        <p className="ds-body-m text-ds-ink">
          New to Hostello?{' '}
          <Link
            href={signupHref}
            className="text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Create an account
          </Link>
          .
        </p>

        <NotePanel title="You do not need an account to browse">
          <p>
            Every listing, every rent, every review and every owner phone number is public
            and stays public.
          </p>
          <p>
            An account adds two things: saving a hostel to a shortlist, and keeping a
            record of the owners you have already contacted.
          </p>
        </NotePanel>
      </div>
    </div>
  );
}
