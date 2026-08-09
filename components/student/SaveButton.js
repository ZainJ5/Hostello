'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';

/**
 * Save / unsave toggle for a listing. This is a shared component: the browse
 * and detail pages mount it too, so it makes no assumption about the page
 * around it.
 *
 * - Works signed-out: the POST comes back 401 and the student is sent to
 *   `/login?next=<where they were>` so they land back on the same card.
 * - Optimistic: the heart flips on click and rolls back if the request fails.
 * - Idempotent on the wire: it sends the *desired* state rather than "toggle",
 *   so a double-click can't leave the UI and `Hostel.saveCount` disagreeing.
 * - Safe inside a card that is itself a link: the click is stopped before it
 *   bubbles into the anchor.
 *
 * The current location is read from `window` inside the handler rather than
 * with `useSearchParams`, deliberately: that hook would force every statically
 * prerendered page mounting this button into a Suspense boundary.
 *
 * @param {string}  hostelId      Required. The listing to toggle.
 * @param {boolean} initialSaved  Server-known state; the button syncs to it.
 * @param {string}  name          Listing name, for the accessible label.
 * @param {'icon'|'button'} variant  Floating heart, or a labelled pill.
 * @param {'sm'|'md'|'lg'} size
 * @param {(saved: boolean) => void} onToggle  Fired after the server confirms.
 */
export default function SaveButton({
  hostelId,
  initialSaved = false,
  name = 'this hostel',
  variant = 'icon',
  size = 'md',
  className,
  onToggle,
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saved, setSaved] = useState(Boolean(initialSaved));
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  // `initialSaved` sets the state at mount only. After that this button is
  // the authority on its own listing: it flips optimistically and reconciles
  // with the server response, so re-syncing from the prop would fight it. When
  // a parent replaces its list it remounts these by key and the fresh server
  // value is picked up then.

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);

    try {
      const res = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostelId, saved: next }),
      });

      if (res.status === 401) {
        if (mounted.current) setSaved(!next);
        const here =
          typeof window === 'undefined'
            ? '/hostels'
            : window.location.pathname + window.location.search;
        router.push(`/login?next=${encodeURIComponent(here)}`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update your saved list');

      if (mounted.current) setSaved(Boolean(data.saved));
      onToggle?.(Boolean(data.saved));
      toast({
        tone: 'success',
        title: data.saved ? 'Saved' : 'Removed from saved',
        description: data.saved
          ? `${name} is in your saved list.`
          : `${name} is no longer saved.`,
        duration: 3000,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      if (mounted.current) setSaved(!next); // rollback
      toast({
        tone: 'danger',
        title: 'That did not save',
        description: err.message || 'Check your connection and try again.',
      });
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  const label = saved ? `Remove ${name} from saved` : `Save ${name}`;

  if (variant === 'button') {
    const heights = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-12 px-5' };
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={label}
        aria-busy={busy || pending || undefined}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border font-medium',
          'transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          heights[size] || heights.md,
          saved
            ? 'border-brand-600 bg-brand-50 text-brand-800 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-200 dark:hover:bg-brand-900'
            : 'border-border-strong bg-surface text-foreground hover:bg-muted',
          busy && 'opacity-70',
          className
        )}
      >
        <Heart
          className={cn('size-4 shrink-0 transition-transform duration-200', saved && 'scale-110')}
          fill={saved ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  const dims = { sm: 'size-9', md: 'size-11', lg: 'size-12' };
  const icons = { sm: 'size-4', md: 'size-5', lg: 'size-5' };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? 'Remove from saved' : 'Save for later'}
      aria-busy={busy || pending || undefined}
      className={cn(
        'grid cursor-pointer place-items-center rounded-full border border-border bg-surface/90 shadow-sm backdrop-blur',
        'transition-[background-color,color,transform,box-shadow] duration-200 hover:shadow-md active:scale-95',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        saved ? 'text-danger' : 'text-muted-foreground hover:text-foreground',
        busy && 'opacity-70',
        dims[size] || dims.md,
        className
      )}
    >
      <Heart
        className={cn(
          'transition-transform duration-200',
          icons[size] || icons.md,
          saved && 'scale-110'
        )}
        fill={saved ? 'currentColor' : 'none'}
        aria-hidden="true"
      />
    </button>
  );
}
