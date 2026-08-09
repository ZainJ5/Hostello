'use client';

import { useCallback, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { EmptyState } from '@/components/ds/Feedback';
import { useToast } from './Toast';

/**
 * The saved shortlist, as the account-saved frame draws it: a stack of compact
 * rows, name, one meta line, then the actions. No photo, because the row is
 * about deciding between listings you have already looked at.
 *
 * Two things in the frame are not built and are absent rather than faked:
 *
 *   the four stage strip  Saved, Family, Visit, Contacted. There is no
 *                         shortlist stage on the model, nothing writes one,
 *                         and drawing four segments would assert a stage the
 *                         product does not hold.
 *   Send to family        there is no share-to-family feature, and the Urdu
 *                         family page it implies does not exist.
 *
 * Removing a card is optimistic: it disappears on click, the request follows,
 * and a toast offers Undo. Undo restores the row at its original index rather
 * than appending it, so the list doesn't reshuffle under the student's eyes. A
 * failed request rolls the row straight back and says so.
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
      // Roll the row back into the exact slot it left.
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
        title="Your shortlist is empty"
        body="Save a hostel from its listing and it waits for you here while you compare rents, facilities and distance from campus. Saving tells the owner nothing and holds no room."
        action={<Button href="/hostels">Browse hostels</Button>}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {hostels.map((hostel) => (
        <li key={String(hostel._id)}>
          <SavedRow
            hostel={hostel}
            busy={busy.has(String(hostel._id))}
            onRemove={() => remove(hostel)}
          />
        </li>
      ))}
    </ul>
  );
}

function SavedRow({ hostel, busy, onRemove }) {
  const phone = hostel.phone || '';

  return (
    <article className="ds-elevated flex flex-col gap-3 rounded-ds-inner p-4">
      <h2 className="ds-display-s text-ds-ink">
        <Link
          href={`/hostels/${hostel.slug}`}
          className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
        >
          {hostel.name}
        </Link>
      </h2>

      {hostel.meta ? <p className="ds-body-s text-ds-ink-muted">{hostel.meta}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {phone ? (
          <Button href={`tel:${phone}`} className="sm:flex-1">
            Call the owner
          </Button>
        ) : null}
        <Button href={`/hostels/${hostel.slug}`} variant="secondary" className="sm:flex-1">
          View listing
        </Button>
        <Button
          variant="secondary"
          onClick={onRemove}
          loading={busy}
          className="sm:flex-1"
          aria-label={`Remove ${hostel.name} from saved`}
        >
          Remove
        </Button>
      </div>
    </article>
  );
}
