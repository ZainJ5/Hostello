'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import AuthHeading from './AuthHeading';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { emailIssue } from './validation';

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
      // registered, so the next screen is the confirmation — it says a code
      // was sent without ever claiming the account exists.
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
        eyebrow="Password help"
        icon={KeyRound}
        title="Forgot your password?"
        description="Enter the email you signed up with and we'll send a 6-digit code to reset it."
      />

      {formError && (
        <Alert tone="danger" className="mb-5">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
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

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Sending code…' : 'Send reset code'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link
          href="/login"
          className="cursor-pointer rounded-md font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:text-brand-200"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
