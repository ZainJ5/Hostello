'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { postJson } from './client';

/**
 * Nudge an open question.
 *
 * A nudge does not name you: the route stores a total and never who sent it.
 * The panel beside this control says so in the page, because a student has to
 * believe that before they will press it.
 *
 * Drawn as a text control rather than a button face, so a row of open
 * questions does not turn into a row of competing calls to action. It still
 * clears the 44px target and still carries the focus ring.
 */
export default function NudgeButton({ threadId, signedIn, signInHref, count = 0 }) {
  const router = useRouter();
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  if (!signedIn) {
    return (
      <a
        href={signInHref}
        className="ds-body-m-strong ds-tap ds-focusable inline-flex shrink-0 items-center px-2 text-ds-cobalt underline-offset-2 hover:underline"
      >
        Sign in to nudge
      </a>
    );
  }

  async function onClick() {
    if (state === 'busy' || state === 'done') return;
    setState('busy');
    setError('');
    try {
      await postJson(`/api/community/threads/${threadId}/nudge`);
      setState('done');
      router.refresh();
    } catch (err) {
      setState('idle');
      setError(err.message);
    }
  }

  return (
    <span className="flex shrink-0 flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={state !== 'idle'}
        aria-live="polite"
        className={cn(
          'ds-body-m-strong ds-tap ds-focusable inline-flex items-center px-2 underline-offset-2',
          state === 'done'
            ? 'cursor-default text-ds-ink-muted'
            : 'text-ds-cobalt hover:underline'
        )}
      >
        {state === 'done' ? 'Nudged' : 'Nudge'}
        {count > 0 && state !== 'done' ? (
          <span className="ds-mono-meta ml-1.5 text-ds-ink-muted">{count}</span>
        ) : null}
      </button>
      {error ? (
        <span role="alert" className="ds-body-s px-2 text-ds-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}
