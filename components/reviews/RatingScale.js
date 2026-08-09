'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * The 1 to 5 rating control from write-review 94:4933.
 *
 * NUMBERS, NOT STARS, and that is the design calling it correctly. Five stars
 * is a shape a student has to translate into a number before they can decide
 * which one they mean, it carries no legend, and at 44 tall on a phone the
 * fifth star sits under the thumb of anybody aiming for the fourth. Five
 * labelled segments say what each one means, read out correctly, and give
 * every option the same target.
 *
 * Built as a radio group rather than five buttons, so the arrow keys move
 * between values, the group has one tab stop, and the legend is announced.
 * Selected is solid ink with inverse text, which is the same grammar the
 * badge, the bed strip and the view toggle already use.
 *
 * The caption under the scale is the legend the stars never had: it names what
 * the chosen number means, so the scale is not left to be guessed at.
 */

const MEANING = {
  1: 'One. Unusable, and you would tell somebody not to come.',
  2: 'Two. You stayed, but you would not do it again.',
  3: 'Three. Fine for the price, with real problems.',
  4: 'Four. Good. Small things you would mention, nothing serious.',
  5: 'Five. Nothing to complain about.',
};

export default function RatingScale({ value, onChange, error, disabled }) {
  const name = useId();
  const describedBy = `${name}-meaning`;

  return (
    <fieldset className="flex w-full flex-col gap-1.5">
      <legend className="ds-body-m-strong mb-1.5 text-ds-ink">
        How would you rate it?
      </legend>

      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const checked = Number(value) === n;
          return (
            <span
              key={n}
              className={cn(
                'flex rounded-ds-slot p-[var(--ds-focus-gap)]',
                'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt'
              )}
            >
              <label
                className={cn(
                  'ds-body-m-strong ds-tap flex w-full cursor-pointer items-center justify-center',
                  'rounded-ds-inner border border-solid',
                  'transition-colors duration-150 motion-reduce:transition-none',
                  disabled
                    ? 'cursor-not-allowed border-ds-hairline bg-ds-surface-sunken text-ds-ink-muted'
                    : checked
                      ? 'border-ds-ink bg-ds-ink text-ds-on-ink'
                      : 'border-ds-control bg-ds-surface-raised text-ds-ink hover:border-ds-cobalt active:bg-ds-surface-sunken'
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={n}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange?.(n)}
                  aria-describedby={describedBy}
                  className="sr-only"
                />
                <span aria-hidden="true">{n}</span>
                <span className="sr-only">{MEANING[n]}</span>
              </label>
            </span>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="ds-body-s mt-1 text-ds-error">
          {error}
        </p>
      ) : (
        <p id={describedBy} className="ds-body-s mt-1 text-ds-ink-muted">
          {value ? MEANING[value] : 'One is unusable. Five is nothing to complain about.'}
        </p>
      )}
    </fieldset>
  );
}
