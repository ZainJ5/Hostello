'use client';

import { cn } from '@/lib/utils';

/**
 * Two selectable cards backed by native radios: they are visually hidden but
 * still receive focus, so arrow keys move between the cards and Space selects,
 * exactly as a screen reader user expects from a radio group.
 *
 * Selection is carried by the keyline moving from `control` to `ink` and by a
 * filled radio mark, not by a tinted fill. There is no tint colour in the 2026
 * palette that would hold body copy at AA, and the same solid versus hollow
 * grammar is what the badge, the filter chip and the bed strip already use.
 *
 * The role decides which console the account lands in, so it stays on the form
 * even though no frame in the file draws it. Removing it would leave every
 * hostel owner signing up as a student.
 */

const OPTIONS = [
  {
    value: 'student',
    title: 'I am a student',
    description:
      'Search hostels near your campus, keep a shortlist and send enquiries to owners.',
  },
  {
    value: 'owner',
    title: 'I am a hostel owner',
    description: 'List your hostel, answer enquiries and keep your rooms up to date.',
  },
];

export default function RolePicker({
  value,
  onChange,
  error,
  disabled = false,
  name = 'role',
  legend = 'I am signing up as',
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="ds-body-s-strong mb-2 text-ds-ink">{legend}</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value: optionValue, title, description }) => {
          const selected = value === optionValue;
          return (
            <label
              key={optionValue}
              className={cn(
                'relative flex cursor-pointer flex-col gap-2 rounded-ds-inner border border-solid p-4',
                'bg-ds-surface-raised transition-colors duration-150 motion-reduce:transition-none',
                selected ? 'border-ds-ink' : 'border-ds-control hover:border-ds-cobalt',
                error && !selected && 'border-ds-error'
              )}
            >
              <input
                type="radio"
                name={name}
                value={optionValue}
                checked={selected}
                onChange={() => onChange?.(optionValue)}
                className="peer sr-only"
              />
              {/* The ring traces the card rather than the hidden radio. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-0.5 rounded-ds-slot opacity-0 outline-2 outline-offset-0 outline-ds-cobalt peer-focus-visible:opacity-100"
              />

              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full border border-solid',
                    selected ? 'border-ds-ink' : 'border-ds-control'
                  )}
                >
                  <span
                    className={cn('size-2.5 rounded-full', selected && 'bg-ds-ink')}
                  />
                </span>
                <span className="ds-body-m-strong text-ds-ink">{title}</span>
              </span>

              <span className="ds-body-s text-pretty text-ds-ink-muted">{description}</span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p className="ds-body-s mt-2 text-ds-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
