'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import AuthHeading from './AuthHeading';
import NotePanel from './NotePanel';
import { TextInput } from './Field';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { emailIssue } from './validation';

/**
 * The frame says "we will send a link. The link works once and lasts an hour".
 * The endpoint sends a six digit code that lasts ten minutes, and the copy
 * here says that instead. A reset flow that describes itself wrongly is the
 * one place a student will assume the site is broken rather than that they
 * misread it.
 */
export default function ForgotPasswordForm({ initialEmail = '' }) {
  const router = useRouter();

  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const issue = emailIssue(email);
    setError(issue);
    if (issue) return;

    setFormError('');
    setSubmitting(true);

    const { ok, status, data } = await apiRequest('/api/auth/forgot-password', {
      body: { email: email.trim() },
    });

    if (ok) {
      // The endpoint answers the same way whether or not the address is
      // registered, so the next screen is the confirmation. It says a code was
      // sent without ever claiming the account exists.
      router.push(`/reset-password?email=${encodeURIComponent(data.email || email.trim())}`);
      return;
    }

    setSubmitting(false);

    if (status === 422) {
      setError(fieldErrors(data).email || '');
      setFormError(data?.error || GENERIC_ERROR);
      return;
    }

    setFormError(data?.error || GENERIC_ERROR);
  }

  return (
    <div>
      <AuthHeading
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Sign in', href: '/login' },
          { label: 'Forgot password' },
        ]}
        title="Reset your password"
        description="Type the address you signed up with and we will send a six digit code. The code works once and lasts ten minutes."
      />

      <div className="flex flex-col gap-5">
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
            hint="If there is an account on this address you will get an email within a minute."
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            onBlur={() => setError(emailIssue(email))}
            error={error}
            disabled={submitting}
            required
          />

          <Button type="submit" loading={submitting} className="w-full">
            Send the reset code
          </Button>
        </form>

        <NotePanel title="We do not say whether an address has an account">
          <p>
            The message reads the same either way. Telling you an address is not
            registered would tell anybody else the same thing, which is how account lists
            get built.
          </p>
        </NotePanel>

        <p className="ds-body-m">
          <Link
            href="/login"
            className="text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
