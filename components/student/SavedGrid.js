'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Compass, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import HostelCard from '@/components/public/HostelCard';
import { useToast } from './Toast';

/**
 * The saved shortlist.
 *
 * Removing a card is optimistic: it disappears on click, the request follows,
 * and a toast offers Undo for five seconds. Undo restores the card at its
 * original index rather than appending it, so the grid doesn't reshuffle under
 * the student's eyes. A failed request rolls the card straight back and says so.
 */
export default function SavedGrid({ hostels: initial }) {
  const router = useRouter();
  const { toast } = useToast();
  const [hostels, setHostels] = useState(initial);
  const [busy, setBusy] = useState(() => new Set());
  const [, startTransition] = useTransition();
  // Guards against a stale Undo firing after the student re-saved by hand.
  const generation = useRef(0);

  const setSaved = useCallback(async (hostelId, saved) => {
    const res = await fetch('/api/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Explicit desired state, not "toggle", so repeated calls converge.
      body: JSON.stringify({ hostelId, saved }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not update your saved list');
    return data;
  }, []);

  function markBusy(id, on) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function remove(hostel) {
    const id = String(hostel._id);
    const index = hostels.findIndex((h) => String(h._id) === id);
    const mine = ++generation.current;

    markBusy(id, true);
    setHostels((list) => list.filter((h) => String(h._id) !== id)); // optimistic

    try {
      await setSaved(id, false);
      toast({
        tone: 'success',
        title: 'Removed from saved',
        description: hostel.name,
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            if (generation.current !== mine) return;
            restore(hostel, index);
          },
        },
      });
      startTransition(() => router.refresh());
    } catch (err) {
      // Roll the card back into the exact slot it left.
      setHostels((list) => {
        const next = [...list];
        next.splice(Math.max(0, index), 0, hostel);
        return next;
      });
      toast({
        tone: 'danger',
        title: 'Could not remove that',
        description: err.message || 'Check your connection and try again.',
      });
    } finally {
      markBusy(id, false);
    }
  }

  async function restore(hostel, index) {
    const id = String(hostel._id);
    markBusy(id, true);
    setHostels((list) => {
      if (list.some((h) => String(h._id) === id)) return list;
      const next = [...list];
      next.splice(Math.max(0, Math.min(index, next.length)), 0, hostel);
      return next;
    });

    try {
      await setSaved(id, true);
      toast({
        tone: 'success',
        title: 'Saved again',
        description: `${hostel.name} is back in your list.`,
        duration: 3000,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      setHostels((list) => list.filter((h) => String(h._id) !== id));
      toast({
        tone: 'danger',
        title: 'Could not restore that',
        description: err.message || 'Try saving it again from the listing.',
      });
    } finally {
      markBusy(id, false);
    }
  }

  if (hostels.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Your shortlist is empty"
        description="Tap the heart on any listing and it will wait for you here while you compare prices, facilities and distance from campus."
        action={
          <Button href="/hostels" variant="primary" size="lg">
            <Compass className="size-4" aria-hidden="true" />
            Browse hostels
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {hostels.map((hostel) => (
        <div key={String(hostel._id)} className="relative">
          {/* Sits top-left so it can never collide with a card's own save
              control, which by convention lives top-right. */}
          <button
            type="button"
            onClick={() => remove(hostel)}
            disabled={busy.has(String(hostel._id))}
            aria-label={`Remove ${hostel.name} from saved`}
            title="Remove from saved"
            className="absolute top-3 left-3 z-10 grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-surface/90 text-muted-foreground shadow-sm backdrop-blur transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-surface hover:text-danger hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {busy.has(String(hostel._id)) ? (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
          </button>
          <HostelCard hostel={hostel} showSave={false} />
        </div>
      ))}
    </div>
  );
}
