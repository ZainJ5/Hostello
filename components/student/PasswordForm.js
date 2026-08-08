'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Check, KeyRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
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
        description: 'Use your new password next time you sign in.',
      });
    }
  }, [state, toast]);

  const errors = state?.fieldErrors || {};

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Change the password you use to sign in to Hostello."
      />
      <CardBody>
        <form ref={form} action={formAction} className="space-y-5">
          {state?.error && (
            <Alert tone="danger" title="That didn't work">
              {state.error}
            </Alert>
          )}
          {state?.ok && (
            <Alert tone="success">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4" aria-hidden="true" />
                {state.message || 'Password changed'}
              </span>
            </Alert>
          )}

          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            error={errors.currentPassword}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="New password"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              hint="At least 8 characters."
              error={errors.newPassword}
            />
            <Input
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              error={errors.confirmPassword}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={pending}>
              <KeyRound className="size-4" aria-hidden="true" />
              Update password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
