'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, TriangleAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import Drawer from './Drawer';
import { useToast } from './Toast';

const CONFIRM_WORD = 'DELETE';

/**
 * Account deletion, two steps and no shortcuts.
 *
 *   1. `POST /api/auth/delete-account` — emails a six digit code.
 *   2. `DELETE /api/auth/delete-account` with that code — permanent.
 *
 * Both endpoints belong to the auth stream; this component only calls them.
 * The typed confirmation word before step 1 exists so the destructive path
 * cannot be walked by muscle memory, and the warning is repeated at the point
 * of no return rather than only at the start.
 */
export default function DangerZone({ email }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('confirm'); // confirm -> code
  const [word, setWord] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function reset() {
    setOpen(false);
    setStep('confirm');
    setWord('');
    setCode('');
    setError('');
    setNotice('');
  }

  async function requestCode() {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send the confirmation code');

      setStep('code');
      setNotice(`We sent a 6-digit code to ${email}. It expires in 10 minutes.`);
      toast({
        tone: 'info',
        title: 'Confirmation code sent',
        description: `Check ${email} for a 6-digit code.`,
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That code was not accepted');

      // The session cookie is gone server-side. Leave the account area and
      // refresh so the router cache drops every payload rendered for it.
      router.replace('/?deleted=1');
      router.refresh();
    } catch (err) {
      setError(err.message || 'That code was not accepted');
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="rounded-[var(--radius-panel)] border-2 border-danger/30 bg-danger-soft/30 dark:bg-danger/5"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="danger-zone-heading" className="text-base font-semibold text-danger">
            Danger zone
          </h2>
          <p className="mt-1 text-sm text-foreground/80 text-pretty">
            Deleting your account removes your profile, saved hostels and reviews.
            Booking requests you have already sent stay with the hostel owner, without
            your account attached. <strong className="font-semibold">This cannot be undone.</strong>
          </p>
        </div>
        <Button
          variant="danger"
          className="shrink-0"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          Delete my account
        </Button>
      </div>

      <Drawer
        open={open}
        onClose={busy ? () => {} : reset}
        size="sm"
        title={step === 'confirm' ? 'Delete your account?' : 'Enter your confirmation code'}
        description={
          step === 'confirm'
            ? 'This is permanent. Read it once more before you continue.'
            : 'The final step. Once this code is accepted your account is gone.'
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={reset} disabled={busy}>
              Keep my account
            </Button>
            {step === 'confirm' ? (
              <Button
                variant="danger"
                loading={busy}
                disabled={word.trim().toUpperCase() !== CONFIRM_WORD}
                onClick={requestCode}
              >
                Email me a code
              </Button>
            ) : (
              <Button
                variant="danger"
                loading={busy}
                disabled={code.length !== 6}
                onClick={deleteAccount}
              >
                Delete permanently
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <Alert tone="danger" title="This cannot be undone">
            Your profile, saved hostels and every review you have written will be deleted.
            You will be signed out immediately and cannot recover the account.
          </Alert>

          {error && (
            <Alert tone="danger" title="That didn't work">
              {error}
            </Alert>
          )}

          {step === 'confirm' ? (
            <>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  'Your saved shortlist is erased.',
                  'Your reviews are removed and hostel ratings recalculated.',
                  'Owners keep the requests you already sent, without your account.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <TriangleAlert
                      className="mt-0.5 size-4 shrink-0 text-danger"
                      aria-hidden="true"
                    />
                    <span className="text-pretty">{line}</span>
                  </li>
                ))}
              </ul>
              <Input
                label={`Type ${CONFIRM_WORD} to continue`}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={CONFIRM_WORD}
                hint="We ask for this so nobody deletes an account by accident."
              />
            </>
          ) : (
            <>
              {notice && <Alert tone="info">{notice}</Alert>}
              <div className="space-y-1.5">
                <label
                  htmlFor="delete-code"
                  className="block text-sm font-medium text-foreground"
                >
                  6-digit confirmation code
                </label>
                <input
                  id="delete-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-describedby="delete-code-hint"
                  className={cn(
                    'h-14 w-full rounded-xl border border-border bg-surface text-center font-mono text-2xl tracking-[0.5em] text-foreground',
                    'transition-colors duration-200 hover:border-border-strong',
                    'focus:border-danger focus:ring-4 focus:ring-danger/12 focus:outline-none'
                  )}
                />
                <p id="delete-code-hint" className="text-xs text-muted-foreground">
                  Didn&apos;t arrive?{' '}
                  <button
                    type="button"
                    onClick={requestCode}
                    disabled={busy}
                    className="cursor-pointer font-medium text-brand-700 underline underline-offset-2 disabled:opacity-60 dark:text-brand-400"
                  >
                    Send another code
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </Drawer>
    </section>
  );
}
