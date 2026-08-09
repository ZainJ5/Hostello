'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';

/**
 * Figma page/roommates-intro 96:6657 and 96:7293.
 *
 * The whole product in one screen. A message goes across, and the other
 * student accepts it, ignores it or blocks. Hostello does not place anybody,
 * does not hold a conversation and does not reserve a bed.
 *
 * Block sits next to Send because the moment a student decides they do not
 * want to be suggested to somebody is usually before any message exists. It
 * asks once, then it is silent: the other student is told nothing.
 */
export default function IntroForm({ match, alreadySent }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirmBlock, setConfirmBlock] = useState(false);

  const firstName = match.displayName.split(/\s+/)[0];
  const limit = 500;

  async function send(event) {
    event.preventDefault();
    if (!message.trim()) {
      setError('Write a line or two first.');
      return;
    }
    setBusy('send');
    setError('');
    try {
      const res = await fetch('/api/roommates/intros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: match.id, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That did not send');
      router.push(`/roommates/matches/${match.id}`);
      router.refresh();
    } catch (err) {
      setBusy('');
      setError(err.message || 'That did not send');
    }
  }

  async function block() {
    if (!confirmBlock) {
      setConfirmBlock(true);
      return;
    }
    setBusy('block');
    setError('');
    try {
      const res = await fetch('/api/roommates/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: match.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That did not work');
      router.push('/roommates/matches');
      router.refresh();
    } catch (err) {
      setBusy('');
      setError(err.message || 'That did not work');
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-6">
      {error ? (
        <Alert tone="error" title="That did not send">
          {error}
        </Alert>
      ) : null}

      {alreadySent ? (
        <Alert title="You have already written to this student">
          Sending again replaces the message they have not answered yet. It does not nudge them:
          Hostello never tells anybody that somebody is waiting.
        </Alert>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="ds-body-s-strong text-ds-ink">Your message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={limit}
          rows={4}
          placeholder={`Hi ${firstName}. I am also looking near campus for September, and I wanted to ask one thing before either of us goes further.`}
          className={cn(
            'ds-body-m min-h-32 w-full resize-y rounded-ds-inner border border-solid',
            'border-ds-control bg-ds-surface-raised px-3 py-2 text-ds-ink',
            'placeholder:text-ds-ink-muted hover:border-ds-cobalt',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
          )}
        />
        <span className="ds-body-s text-ds-ink-muted">
          Keep it short. Most students reply to a message that asks one clear question.
        </span>
      </label>

      <section className="flex flex-col gap-3">
        <h2 className="ds-display-s text-ds-ink">What happens after you send</h2>
        <ul className="flex flex-col gap-3">
          {[
            `${firstName} can accept, ignore it, or block. Ignoring tells you nothing, which is deliberate.`,
            `If ${firstName} accepts, you both see full names and whatever each of you chose to be reached on.`,
            'Neither of you is committed to a room. Beds are still arranged with the hostel owner separately.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 border border-solid border-ds-ink bg-ds-primary"
              />
              <span className="ds-body-m text-ds-ink-muted">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <Button
          type="button"
          variant="secondary"
          onClick={block}
          loading={busy === 'block'}
          disabled={busy === 'send'}
          className="sm:w-auto"
        >
          {confirmBlock ? 'Confirm block' : 'Block'}
        </Button>
        <Button
          type="submit"
          loading={busy === 'send'}
          disabled={busy === 'block'}
          className="sm:flex-1"
        >
          Send intro request
        </Button>
      </div>

      {confirmBlock ? (
        <p className="ds-body-s text-ds-ink-muted">
          Blocking removes {firstName} from your matches and you from theirs, in both
          directions. They are not told. Press Confirm block to go ahead, or leave this page to
          change your mind.
        </p>
      ) : null}
    </form>
  );
}
