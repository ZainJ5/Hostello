'use client';

import { useActionState, useEffect, useRef } from 'react';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import PasswordField from '@/components/auth/PasswordField';
import { useToast } from './Toast';

const INITIAL = { ok: false, error: '', fieldErrors: {} };

/** Change password. Clears itself on success so nothing is left on screen. */
export default function PasswordForm({ action }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const form = useRef(null);

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      toast({
        tone: 'success',
        title: 'Password changed',
        description: 'Use the new one next time you sign in.',
      });
    }
  }, [state, toast]);

  const errors = state?.fieldErrors || {};

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-5">
      {state?.error ? (
        <Alert tone="error" title="That did not work">
          {state.error}
        </Alert>
      ) : null}
      {state?.ok ? <Alert title={state.message || 'Password changed'} /> : null}

      <PasswordField
        label="Current password"
        name="currentPassword"
        required
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <PasswordField
        label="New password"
        name="newPassword"
        required
        minLength={8}
        autoComplete="new-password"
        hint="Eight characters or more, with at least one letter and one number."
        error={errors.newPassword}
      />
      <PasswordField
        label="Type it again"
        name="confirmPassword"
        required
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <Button
        type="submit"
        variant="secondary"
        loading={pending}
        className="w-full sm:w-auto sm:self-start"
      >
        Update password
      </Button>
    </form>
  );
}
