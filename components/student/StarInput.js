'use client';

import { useId, useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/**
 * Star picker built on a native radio group, so arrow keys, Space and screen
 * readers all work without a single custom key handler.
 *
 * Solid ink for a star that counts, a hollow keyline for one that does not,
 * which is the same grammar as the badge, the filter chip and the bed strip.
 * There is no gold here: the palette carries chrome yellow for actions only,
 * and a yellow star at 1.90:1 on white would not be perceivable anyway. The
 * score is spelled out in words beside the row, so the reading never depends
 * on the drawing.
 */
export default function StarInput({
  name,
  label = 'Overall rating',
  value = 0,
  onChange,
  error,
  size = 'lg',
}) {
  const groupId = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === 'sm' ? 'size-5' : 'size-7';

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="ds-body-s-strong text-ds-ink">{label}</legend>

      <div className="flex flex-wrap items-center gap-3" onMouseLeave={() => setHover(0)}>
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              htmlFor={`${groupId}-${n}`}
              onMouseEnter={() => setHover(n)}
              title={WORDS[n]}
              className={cn(
                'ds-tap grid cursor-pointer place-items-center rounded-ds-inner',
                'has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ds-cobalt'
              )}
            >
              <input
                id={`${groupId}-${n}`}
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange?.(n)}
                className="sr-only"
              />
              <Star
                className={cn(
                  px,
                  'transition-colors duration-150 motion-reduce:transition-none',
                  shown >= n ? 'text-ds-ink' : 'text-ds-control'
                )}
                fill={shown >= n ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span className="sr-only">
                {n} star{n === 1 ? '' : 's'}, {WORDS[n]}
              </span>
            </label>
          ))}
        </div>
        <span className={cn('ds-body-m', shown ? 'text-ds-ink' : 'text-ds-ink-muted')}>
          {shown ? `${shown} of 5, ${WORDS[shown]}` : 'Pick a star'}
        </span>
      </div>

      {error ? (
        <p className="ds-body-s text-ds-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
