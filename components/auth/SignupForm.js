'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import AuthHeading from './AuthHeading';
import PasswordField from './PasswordField';
import PasswordStrength from './PasswordStrength';
import RolePicker from './RolePicker';
import { apiRequest, fieldErrors, GENERIC_ERROR } from './api';
import { emailIssue, nameIssue, passwordIssue } from './validation';

export default function SignupForm({ nextPath = '', initialRole = 'student' }) {
  const router = useRouter();

  const [values, setValues] = useState({
    role: initialRole,
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';

  function setField(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {
      role: values.role ? '' : 'Choose whether you are a student or a hostel owner',
      name: nameIssue(values.name),
      email: emailIssue(values.email),
      password: passwordIssue(values.password),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setFormError('');
    setSubmitting(true);

    const { ok, status, data } = await apiRequest('/api/auth/signup', {
      body: {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
      },
    });

    if (ok) {
      const query = new URLSearchParams({ email: data.email, purpose: 'signup' });
      if (nextPath) query.set('next', nextPath);
      // Stays disabled through the navigation so a double tap can't fire a
      // second signup and burn another code.
      router.push(`/verify?${query.toString()}`);
      return;
    }

    setSubmitting(false);

    if (status === 422) {
      setErrors(fieldErrors(data));
      setFormError(data?.error || GENERIC_ERROR);
      return;
    }

    if (status === 409) {
      setErrors((prev) => ({ ...prev, email: 'This email is already registered' }));
    }

    setFormError(data?.error || GENERIC_ERROR);
  }

  return (
    <div>
      <AuthHeading
        eyebrow="Free to join"
        icon={Sparkles}
        title="Create your account"
        description="One account to shortlist hostels, message owners and track your bookings."
      />

      {formError && (
        <Alert tone="danger" className="mb-5">
          {formError}{' '}
          {formError.toLowerCase().includes('already') && (
            <Link
              href={loginHref}
              className="cursor-pointer font-semibold underline underline-offset-2"
            >
              Sign in instead
            </Link>
          )}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <RolePicker
          value={values.role}
          onChange={(role) => setField('role', role)}
          error={errors.role}
          disabled={submitting}
        />

        <div className="space-y-4">
          <Input
            label="Full name"
            name="name"
            autoComplete="name"
            placeholder="Ayesha Khan"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => setErrors((p) => ({ ...p, name: nameIssue(values.name) }))}
            error={errors.name}
            disabled={submitting}
            required
          />

          <Input
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            hint="We'll send a 6-digit code here to confirm it's yours."
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => setErrors((p) => ({ ...p, email: emailIssue(values.email) }))}
            error={errors.email}
            disabled={submitting}
            required
          />

          <div>
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={values.password}
              onChange={(e) => setField('password', e.target.value)}
              onBlur={() =>
                setErrors((p) => ({ ...p, password: passwordIssue(values.password) }))
              }
              error={errors.password}
              disabled={submitting}
              required
            />
            {values.password && <PasswordStrength value={values.password} className="mt-3" />}
          </div>
        </div>

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Creating your account…' : 'Create account'}
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          By creating an account you agree to Hostello&apos;s terms of use and privacy
          policy. We only email you about your account and your bookings.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={loginHref}
          className="cursor-pointer rounded-md font-semibold text-brand-700 transition-colors duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:text-brand-200"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
