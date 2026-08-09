'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import AuthHeading from './AuthHeading';
import NotePanel from './NotePanel';
import PasswordField from './PasswordField';
import PasswordStrength from './PasswordStrength';
import RolePicker from './RolePicker';
import { TextInput } from './Field';
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
        trail={[{ label: 'Home', href: '/' }, { label: 'Create an account' }]}
        title="Create an account"
        description="Two minutes. Students never pay Hostello anything, for this or for anything else."
      />

      <div className="flex flex-col gap-5">
        {formError ? (
          <Alert tone="error" title="That did not work">
            {formError}{' '}
            {formError.toLowerCase().includes('already') ? (
              <Link
                href={loginHref}
                className="text-ds-cobalt underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
              >
                Sign in instead
              </Link>
            ) : null}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <RolePicker
            value={values.role}
            onChange={(role) => setField('role', role)}
            error={errors.role}
            disabled={submitting}
          />

          <TextInput
            label="Your name"
            name="name"
            autoComplete="name"
            placeholder="Zoya Rehman"
            hint="This is what a hostel owner sees when you contact them."
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => setErrors((p) => ({ ...p, name: nameIssue(values.name) }))}
            error={errors.name}
            disabled={submitting}
            required
          />

          <TextInput
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            hint="We send a six digit code here to confirm it is yours."
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => setErrors((p) => ({ ...p, email: emailIssue(values.email) }))}
            error={errors.email}
            disabled={submitting}
            required
          />

          <div className="flex flex-col gap-3">
            <PasswordField
              label="Password"
              name="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              hint="Eight characters or more, with at least one letter and one number."
              value={values.password}
              onChange={(e) => setField('password', e.target.value)}
              onBlur={() =>
                setErrors((p) => ({ ...p, password: passwordIssue(values.password) }))
              }
              error={errors.password}
              disabled={submitting}
              required
            />
            {values.password ? <PasswordStrength value={values.password} /> : null}
          </div>

          <Button type="submit" loading={submitting} className="w-full">
            Create account
          </Button>
        </form>

        <p className="ds-body-m text-ds-ink">
          Already have one?{' '}
          <Link
            href={loginHref}
            className="text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            Sign in
          </Link>
          .
        </p>

        <NotePanel title="What we do with this">
          <p>
            Your name goes to a hostel owner only when you contact one. Your email address
            never does.
          </p>
          <p>
            We do not sell your details to hostels, agents or anybody else, and there is no
            broker in this product to sell them to.
          </p>
        </NotePanel>
      </div>
    </div>
  );
}
