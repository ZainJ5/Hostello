'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import Avatar from '@/components/roommates/Avatar';
import Badge from '@/components/ds/Badge';
import Button from '@/components/ds/Button';
import MetaStrip from '@/components/roommates/MetaStrip';
import { Alert } from '@/components/ds/Feedback';

/**
 * Introductions, both directions.
 *
 * Not a frame in the design file. It is here because the file draws a product
 * in which somebody accepts, ignores or blocks a request, and there was
 * nowhere for that to happen. It sits above the matches list rather than
 * becoming a fifth route, which keeps it in front of the person it is for.
 *
 * The lifecycle reading of the strip, and the only honest one it can have:
 *
 *   sent       filled the moment it is written
 *   delivered  filled too, because it is in their list immediately
 *   accepted   filled only on an accept
 *
 * There is deliberately no segment for read, ignored or blocked. A sender who
 * can see that a request was opened and not accepted has been told it was
 * refused, and the whole point of ignoring somebody is that it says nothing.
 * So a waiting request and an ignored one draw the same three segments.
 */

const LIFECYCLE_LABELS = ['sent', 'delivered', 'accepted'];

function SentRow({ intro }) {
  const segments = [2, 2, intro.accepted ? 2 : 0];
  const summary = intro.accepted
    ? `${intro.displayName} accepted. You can both see full names now.`
    : `Waiting. ${intro.displayName} has not answered, and Hostello will not chase.`;

  return (
    <li className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="ds-body-m-strong text-ds-ink">You wrote to {intro.displayName}</p>
        <Badge variant={intro.accepted ? 'solid' : 'outline'}>
          {intro.accepted ? 'Accepted' : 'Waiting'}
        </Badge>
      </div>
      <MetaStrip
        segments={segments}
        labels={LIFECYCLE_LABELS}
        summary={summary}
        label={`Request to ${intro.displayName}: ${intro.accepted ? 'accepted' : 'waiting'}.`}
      />
    </li>
  );
}

function ReceivedRow({ intro, onAnswer, busy }) {
  const meta = [intro.year, intro.programme].filter(Boolean).join(', ');
  const decided = intro.status !== 'sent';

  return (
    <li className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4">
      <div className="flex items-center gap-3">
        <Avatar initials={intro.initials} />
        <div className="flex min-w-0 flex-col">
          <p className="ds-body-m-strong truncate text-ds-ink">{intro.displayName}</p>
          {meta ? <p className="ds-body-s truncate text-ds-ink-muted">{meta}</p> : null}
        </div>
      </div>

      {intro.message ? <p className="ds-body-m text-ds-ink">{intro.message}</p> : null}

      {decided ? (
        <p className="ds-body-s text-ds-ink-muted">
          {intro.status === 'accepted'
            ? 'You accepted. You can both see full names now.'
            : 'Answered. Nothing was sent back and nothing will be.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => onAnswer(intro.id, 'accept')}
            loading={busy === `${intro.id}:accept`}
          >
            Accept
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onAnswer(intro.id, 'ignore')}
            loading={busy === `${intro.id}:ignore`}
          >
            Ignore
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onAnswer(intro.id, 'block')}
            loading={busy === `${intro.id}:block`}
          >
            Block
          </Button>
        </div>
      )}
    </li>
  );
}

export default function IntroInbox({ received = [], sent = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  if (!received.length && !sent.length) return null;

  async function answer(id, action) {
    setBusy(`${id}:${action}`);
    setError('');
    try {
      const res = await fetch(`/api/roommates/intros/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'That did not go through');
      router.refresh();
    } catch (err) {
      setError(err.message || 'That did not go through');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="ds-display-s text-ds-ink">Introductions</h2>

      {error ? (
        <Alert tone="error" title="That did not go through">
          {error}
        </Alert>
      ) : null}

      {received.length ? (
        <ul className="flex flex-col gap-3">
          {received.map((intro) => (
            <ReceivedRow key={intro.id} intro={intro} onAnswer={answer} busy={busy} />
          ))}
        </ul>
      ) : null}

      {sent.length ? (
        <ul className="flex flex-col gap-3">
          {sent.map((intro) => (
            <SentRow key={intro.id} intro={intro} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
