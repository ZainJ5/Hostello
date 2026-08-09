'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';

/**
 * Optimistic shortlist toggle. The saved collection belongs to the account
 * area (`POST /api/saved`), so this owns the interaction only: flip
 * immediately, send the request, roll back with a line of text if it fails.
 *
 * A 401 is not a failure, it means "sign in first", so the student is routed
 * to login and brought back to the listing afterwards.
 *
 * The label carries the state in words as well as in the fill, because the
 * card and the badge already use solid versus hollow to mean something else
 * and a second meaning for the same shape would be ambiguous.
 */
export default function SaveButton({ hostelId, initialSaved = false, className }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function toggle() {
    const next = !saved;
    setSaved(next);
    setError('');

    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostelId, saved: next }),
      });

      if (res.status === 401 || res.status === 403) {
        setSaved(!next);
        startTransition(() => router.push(`/login?next=${encodeURIComponent(pathname)}`));
        return;
      }
      if (!res.ok) throw new Error('save failed');
    } catch {
      setSaved(!next);
      setError('Could not save just now. Try again.');
    }
  }

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <Button
        variant="secondary"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={saved}
        className="w-full"
      >
        {saved ? 'Saved' : 'Save this hostel'}
      </Button>
      {error ? (
        <p role="status" className="ds-body-s text-ds-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
