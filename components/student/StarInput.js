'use client';

import { useId, useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/**
 * Star picker built on a native radio group, so arrow keys, Space and screen
 * readers all work without a single custom key handler. The visible label
 * spells the score out in words as well as stars — never colour or shape alone.
 */
export default function StarInput({
  name,
  label = 'Overall rating',
  value = 0,
  onChange,
  required,
  error,
  size = 'lg',
}) {
  const groupId = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === 'sm' ? 'size-5' : 'size-8';

  return (
    <fieldset className="space-y-1.5">
      <legend className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </legend>

      <div className="flex items-center gap-3" onMouseLeave={() => setHover(0)}>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              htmlFor={`${groupId}-${n}`}
              onMouseEnter={() => setHover(n)}
              title={WORDS[n]}
              className={cn(
                'grid size-11 cursor-pointer place-items-center rounded-lg transition-[background-color,transform] duration-200',
                'hover:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                shown >= n && 'scale-105'
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
                  'transition-colors duration-200',
                  shown >= n
                    ? 'text-accent-400'
                    : 'text-slate-300 dark:text-slate-600'
                )}
                fill={shown >= n ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              <span className="sr-only">
                {n} star{n === 1 ? '' : 's'} — {WORDS[n]}
              </span>
            </label>
          ))}
        </div>
        <span
          className={cn(
            'text-sm font-medium',
            shown ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {shown ? `${shown}/5 · ${WORDS[shown]}` : 'Tap a star'}
        </span>
      </div>

      {error && (
        <p className="flex items-start gap-1 text-xs text-danger" role="alert">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </fieldset>
  );
}
