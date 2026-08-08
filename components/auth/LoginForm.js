'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import AuthHeading from './AuthHeading';
import PasswordField from './PasswordField';
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

    // The account exists but has never confirmed its address — send them to
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
        eyebrow="Welcome back"
        icon={LogIn}
        title="Sign in to Hostello"
        description="Pick up where you left off — your saved hostels and enquiries are waiting."
      />

      {passwordWasReset && (
        <Alert tone="success" title="Password updated" className="mb-5">
          Sign in with your new password.
        </Alert>
      )}

      {nextPath && !passwordWasReset && (
        <Alert tone="info" className="mb-5">
          Sign in to continue to <span className="font-medium">{nextPath}</span>.
        </Alert>
      )}

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
          value={values.password}
          onChange={(e) => setField('password', e.target.value)}
          error={errors.password}
          disabled={submitting}
          required
          action={
            <Link
              href="/forgot-password"
              className="cursor-pointer rounded-md text-xs font-medium text-brand-700 transition-colors duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:text-brand-200"
            >
              Forgot password?
            </Link>
          }
        />

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Hostello?{' '}
        <Link
          href={signupHref}
          className="cursor-pointer rounded-md font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:text-brand-200"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
