'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { TextInput } from '@/components/auth/Field';
import OtpInput, { OTP_LENGTH } from '@/components/auth/OtpInput';
import Drawer from './Drawer';
import { useToast } from './Toast';

const CONFIRM_WORD = 'DELETE';

/**
 * Account deletion in two steps:
 *
 *   1. `POST /api/auth/delete-account` emails a six digit code.
 *   2. `DELETE /api/auth/delete-account` with that code, which is permanent.
 *
 * Both endpoints belong to the auth stream; this component only calls them.
 * The typed confirmation word before step 1 exists so the destructive path
 * cannot be walked by muscle memory, and the warning is repeated at the point
 * of no return rather than only at the start.
 *
 * The trigger is a plain link in error colour rather than a filled red button.
 * The palette has one status colour and no red fill, and the frame draws it as
 * a link too. Everything that makes this hard to do by accident is behind the
 * link, not on it.
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
      setNotice(`We sent a six digit code to ${email}. It expires in ten minutes.`);
      toast({
        tone: 'info',
        title: 'Confirmation code sent',
        description: `Check ${email} for a six digit code.`,
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
      setError('Enter the six digit code from your email');
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
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="ds-body-m-strong ds-tap inline-flex cursor-pointer items-center justify-start self-start rounded-ds-inner text-ds-error underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ds-cobalt"
      >
        Delete your account
      </button>

      <Drawer
        open={open}
        onClose={busy ? () => {} : reset}
        size="sm"
        title={step === 'confirm' ? 'Delete your account?' : 'Enter your confirmation code'}
        description={
          step === 'confirm'
            ? 'This is permanent. Read it once more before you continue.'
            : 'The last step. Once this code is accepted the account is gone.'
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={reset} disabled={busy}>
              Keep my account
            </Button>
            {step === 'confirm' ? (
              <Button
                loading={busy}
                disabled={word.trim().toUpperCase() !== CONFIRM_WORD}
                onClick={requestCode}
              >
                Email me a code
              </Button>
            ) : (
              <Button loading={busy} disabled={code.length !== OTP_LENGTH} onClick={deleteAccount}>
                Delete permanently
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert tone="error" title="This cannot be undone">
            Your profile, your saved shortlist and every review you have written are
            deleted. You are signed out immediately and the account cannot be recovered.
          </Alert>

          {error ? (
            <Alert tone="error" title="That did not work">
              {error}
            </Alert>
          ) : null}

          {step === 'confirm' ? (
            <>
              <ul className="flex flex-col gap-2">
                {[
                  'Your saved shortlist is erased.',
                  'Your reviews come off the listings and the ratings are recalculated.',
                  'Owners keep the enquiries you already sent, without your account attached.',
                ].map((line) => (
                  <li key={line} className="ds-body-m flex items-start gap-2 text-ds-ink-muted">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-ds-ink-muted"
                    />
                    <span className="text-pretty">{line}</span>
                  </li>
                ))}
              </ul>
              <TextInput
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
              {notice ? <Alert title="Code sent">{notice}</Alert> : null}
              <div className="flex flex-col gap-1.5">
                <p className="ds-body-s-strong text-ds-ink">Confirmation code</p>
                <OtpInput
                  value={code}
                  onChange={setCode}
                  invalid={Boolean(error)}
                  disabled={busy}
                  autoFocus
                  label="Account deletion code"
                  describedBy="delete-code-hint"
                />
                <p id="delete-code-hint" className="ds-body-s text-ds-ink-muted">
                  Not arrived?{' '}
                  <button
                    type="button"
                    onClick={requestCode}
                    disabled={busy}
                    className="cursor-pointer text-ds-cobalt underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt disabled:text-ds-ink-muted"
                  >
                    Send another code
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}
