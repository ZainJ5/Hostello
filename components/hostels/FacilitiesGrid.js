import Chip from '@/components/ds/Chip';
import { FACILITIES } from '@/models/Hostel';
import { cn } from '@/lib/utils';

/**
 * Figma section/what-this-place-offers 85:2115. A wrapping row of chips, then
 * one line naming the notable absences.
 *
 * The absences line is the part that earns its place. "No AC" is exactly what
 * a student needs to learn before they take a rickshaw across Islamabad to
 * look at a room, not after, and a grid of what is present cannot say it.
 *
 * Chips are in the vocabulary's own order, so the same facility sits in the
 * same place on every listing and two hostels can be compared by shape.
 */

/** Read in a sentence rather than as a database value. */
const IN_WORDS = {
  WiFi: 'wifi',
  Meals: 'a mess',
  AC: 'air conditioning',
  'Power Backup': 'backup power',
  'Attached Bath': 'an attached bath',
  Laundry: 'laundry',
  Transport: 'transport',
};

/** The handful people actively screen for. Anything else is not worth a line. */
const NOTABLE = ['WiFi', 'Meals', 'AC', 'Power Backup', 'Attached Bath', 'Laundry', 'Transport'];

export default function FacilitiesGrid({ facilities = [], className }) {
  const has = new Set((facilities || []).filter(Boolean));
  const present = FACILITIES.filter((f) => has.has(f));
  const missing = NOTABLE.filter((f) => !has.has(f));

  if (!present.length && !missing.length) return null;

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {present.length ? (
        <ul className="flex flex-wrap gap-2">
          {present.map((f) => (
            <li key={f}>
              <Chip className="px-2.5 py-1.5">{f}</Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ds-body-m text-ds-ink-muted">
          The owner has not listed what is included. Worth asking on the call.
        </p>
      )}

      {missing.length && present.length ? (
        <p className="ds-body-s text-ds-ink-muted">
          Not offered: {missing.map((f) => IN_WORDS[f] || f.toLowerCase()).join(', ')}.
        </p>
      ) : null}
    </div>
  );
}
