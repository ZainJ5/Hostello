'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from './client';

/**
 * Take your own post down early. The seats filled, the lamp sold, the bottle
 * turned up.
 *
 * Two taps, because a stray tap on a phone should not remove a post, and no
 * modal, because a confirm dialog for something that was going to expire on
 * its own anyway is more ceremony than the action deserves.
 */
export default function RemoveNoticeButton({ noticeId }) {
  const router = useRouter();
  const [state, setState] = useState('idle');

  async function onClick() {
    if (state === 'idle') {
      setState('confirm');
      return;
    }
    if (state !== 'confirm') return;
    setState('busy');
    try {
      await postJson(`/api/community/notices/${noticeId}`, undefined, 'DELETE');
      router.refresh();
    } catch {
      setState('idle');
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'busy'}
      className="ds-body-s ds-tap ds-focusable inline-flex items-center px-2 text-ds-ink-muted underline-offset-2 hover:text-ds-cobalt hover:underline"
    >
      {state === 'confirm' ? 'Tap again to take it down' : 'Take it down'}
    </button>
  );
}
