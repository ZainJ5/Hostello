import { cn } from '@/lib/utils';

/**
 * The signature component. Figma slot-strip/beds 16:27 and slot/bed 16:5.
 *
 * Segments are always flex fill, never a fixed width, so a four bed and an
 * eight bed room occupy the same span with thinner segments and the shape
 * stays comparable down a list of cards.
 *
 * Height is locked by --ds-strip-bed and never changes between tiers, so a
 * card cannot reflow when a student verifies.
 *
 * The four tiers:
 *   unknown  dashed hollow segments. This is the day one state for every
 *            listing, because occupancy comes from owners and there is no
 *            owner tool that reports it. The bed count is real (it comes
 *            from the room type); the fill is absent because the product
 *            genuinely does not know who is in the beds.
 *   none     ink for taken, chrome yellow for open, label carries the count.
 *   initials names at most two residents by initial, then rolls up.
 *   named    names at most two residents in full, then rolls up.
 *
 * A taken or open bed is never drawn from a guess.
 */

const TIERS = ['unknown', 'none', 'initials', 'named'];

/** One segment. Taken is ink, open is chrome yellow, yours is cobalt. */
function Segment({ tone }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'min-w-px flex-1 border',
        tone === 'unknown'
          ? 'border-dashed border-ds-control bg-ds-surface'
          : 'border-solid border-ds-control',
        tone === 'taken' && 'bg-ds-ink',
        // Chrome yellow marks the open slot. It is one of the three places
        // yellow is allowed to appear at all.
        tone === 'open' && 'bg-ds-primary',
        // Cobalt is never used for open: against ink it disappears at this height.
        tone === 'mine' && 'bg-ds-cobalt'
      )}
      style={{ height: 'var(--ds-strip-bed)' }}
    />
  );
}

/**
 * Rolls a resident list up to at most two names, so the label stays one line.
 * Returns null when there is nobody to name.
 */
function describeResidents(residents, style) {
  if (!Array.isArray(residents) || residents.length === 0) return null;
  const shown = residents.slice(0, 2).map((r) => (style === 'initials' ? r.initials : r.name));
  const rest = residents.length - shown.length;
  const people = shown.join(', ');
  if (rest === 0) return `${people} ${residents.length === 1 ? 'lives' : 'live'} here`;
  return `${people} and ${rest} ${rest === 1 ? 'other' : 'others'} live here`;
}

export default function BedStrip({
  beds,
  taken = 0,
  residents = [],
  tier = 'unknown',
  yours = -1,
  className,
  labelId,
}) {
  const total = Number(beds) > 0 ? Math.min(Math.round(Number(beds)), 8) : 0;
  if (!total) return null;

  const safeTier = TIERS.includes(tier) ? tier : 'unknown';
  const isUnknown = safeTier === 'unknown';

  const segments = Array.from({ length: total }, (_, i) => {
    if (isUnknown) return 'unknown';
    if (i === yours) return 'mine';
    return i < taken ? 'taken' : 'open';
  });

  // The bed count appears only in the tiers that have nothing else to say.
  // Naming tiers drop it, because the drawing already carries availability
  // and the words are there to name people.
  let label;
  if (isUnknown) {
    label = `${total} ${total === 1 ? 'bed' : 'beds'}, occupancy not confirmed`;
  } else if (safeTier === 'none') {
    const open = total - taken;
    label = `${open} of ${total} ${total === 1 ? 'bed' : 'beds'} open`;
  } else {
    label =
      describeResidents(residents, safeTier) ||
      `${total - taken} of ${total} ${total === 1 ? 'bed' : 'beds'} open`;
  }

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <div className="flex w-full gap-1 overflow-hidden">
        {segments.map((tone, i) => (
          <Segment key={i} tone={tone} />
        ))}
      </div>
      <p
        id={labelId}
        className="ds-body-s w-full overflow-hidden text-ellipsis whitespace-nowrap text-ds-ink-muted"
      >
        {label}
      </p>
    </div>
  );
}
