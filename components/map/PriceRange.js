'use client';

import { useId } from 'react';
import { PRICE_CEIL, PRICE_FLOOR, PRICE_STEP } from './config';
import { formatPKR } from '@/lib/utils';

const span = PRICE_CEIL - PRICE_FLOOR;
const pct = (v) => ((v - PRICE_FLOOR) / span) * 100;

function label(min, max) {
  if (min <= PRICE_FLOOR && max >= PRICE_CEIL) return 'Any budget';
  if (min <= PRICE_FLOOR) return `Up to ${formatPKR(max)}`;
  if (max >= PRICE_CEIL) return `${formatPKR(min)}+`;
  return `${formatPKR(min)} – ${max.toLocaleString('en-PK')}`;
}

/**
 * Two native range inputs stacked on one track: real keyboard support and real
 * screen-reader semantics, which a div-and-pointerdown slider cannot give.
 * The track itself ignores pointer events so only the thumbs are grabbable.
 */
export default function PriceRange({ min, max, onChange }) {
  const id = useId();
  // When both thumbs sit at the top of the range the upper input would swallow
  // every drag, so the lower one is raised once it passes the midpoint.
  const minOnTop = min > span * 0.6;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground" id={`${id}-label`}>
          Monthly rent
        </span>
        <span className="tabular text-xs font-semibold text-brand-700 dark:text-brand-300">
          {label(min, max)}
        </span>
      </div>

      <div className="relative mt-3.5 h-5">
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <span
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600 dark:bg-brand-400"
          style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }}
        />

        <input
          type="range"
          className="hm-range"
          style={{ zIndex: minOnTop ? 4 : 3 }}
          min={PRICE_FLOOR}
          max={PRICE_CEIL}
          step={PRICE_STEP}
          value={min}
          aria-label="Minimum monthly rent"
          aria-valuetext={formatPKR(min)}
          onChange={(e) => onChange(Math.min(Number(e.target.value), max), max)}
        />
        <input
          type="range"
          className="hm-range"
          style={{ zIndex: minOnTop ? 3 : 4 }}
          min={PRICE_FLOOR}
          max={PRICE_CEIL}
          step={PRICE_STEP}
          value={max}
          aria-label="Maximum monthly rent"
          aria-valuetext={formatPKR(max)}
          onChange={(e) => onChange(min, Math.max(Number(e.target.value), min))}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span className="tabular">{PRICE_FLOOR.toLocaleString('en-PK')}</span>
        <span className="tabular">{PRICE_CEIL.toLocaleString('en-PK')}+</span>
      </div>
    </div>
  );
}
