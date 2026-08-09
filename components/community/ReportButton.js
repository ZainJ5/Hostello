'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { postJson } from './client';

/**
 * Report an answer, a question or a post on the board.
 *
 * Three reports from three different accounts hides it, which is the threshold
 * reviews already use. Nothing tells the author, and nothing lands in a queue,
 * because the admin console is frozen for this work. That gap is real and it
 * is written up rather than papered over: content can currently be hidden by
 * three accounts and no human ever sees it again.
 *
 * Quiet by design. A prominent report control on every card invites use, and
 * the honest ratio on a small board is one report to several hundred posts.
 */
export default function ReportButton({ endpoint, payload, label = 'Report', className }) {
  const router = useRouter();
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  async function onClick() {
    if (state !== 'idle') return;
    setState('busy');
    setError('');
    try {
      await postJson(endpoint, payload || {});
      setState('done');
      router.refresh();
    } catch (err) {
      setState('idle');
      setError(err.message);
    }
  }

  return (
    <span className={cn('flex flex-col items-start', className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={state !== 'idle'}
        className={cn(
          'ds-body-s ds-tap ds-focusable inline-flex items-center px-2 underline-offset-2',
          state === 'done'
            ? 'cursor-default text-ds-ink-muted'
            : 'text-ds-ink-muted hover:text-ds-cobalt hover:underline'
        )}
      >
        {state === 'done' ? 'Reported' : label}
      </button>
      {error ? (
        <span role="alert" className="ds-body-s px-2 text-ds-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}
