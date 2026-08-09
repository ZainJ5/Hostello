'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Optimistic save toggle. The saved-listings collection belongs to the student
 * stream (`POST /api/saved`), so this component only owns the interaction:
 * flip immediately, send the request, and roll back with an inline message if
 * it fails. A 401 is not a failure; it means "sign in first", so we route the
 * student to login and bring them back to this listing afterwards.
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
        startTransition(() =>
          router.push(`/login?next=${encodeURIComponent(pathname)}`)
        );
        return;
      }
      if (!res.ok) throw new Error('save failed');
    } catch {
      setSaved(!next);
      setError('Could not save just now');
    }
  }

  return (
    <div className={cn('inline-flex flex-col items-start', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        disabled={isPending}
        className={cn(
          'inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium',
          'transition-colors duration-200 hover:bg-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          saved ? 'text-danger' : 'text-foreground'
        )}
      >
        <Heart
          className={cn('size-4 transition-transform duration-200', saved && 'scale-110 fill-current')}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
        <span className="sr-only sm:hidden">{saved ? 'Remove from saved' : 'Save this hostel'}</span>
      </button>
      {error && (
        <span role="status" className="mt-0.5 text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
