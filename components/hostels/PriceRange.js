'use client';

import { useId } from 'react';
import { cn, formatPKR } from '@/lib/utils';
import { PRICE_MAX, PRICE_MIN, PRICE_STEP } from './filters';

/**
 * Two native range inputs stacked on one track. Native inputs give keyboard
 * control, screen-reader value announcements and touch behaviour for free; the
 * inputs themselves are pointer-transparent so only the thumbs capture drags
 * and the lower thumb can still be grabbed where the two overlap.
 */
const THUMB =
  'appearance-none pointer-events-none absolute inset-x-0 top-1/2 h-11 w-full -translate-y-1/2 bg-transparent ' +
  'focus:outline-none cursor-pointer ' +
  // WebKit / Blink
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface ' +
  '[&::-webkit-slider-thumb]:bg-brand-700 [&::-webkit-slider-thumb]:shadow-md ' +
  '[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:transition-transform ' +
  '[&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:scale-110 ' +
  'active:[&::-webkit-slider-thumb]:scale-95 ' +
  '[&:focus-visible::-webkit-slider-thumb]:ring-4 [&:focus-visible::-webkit-slider-thumb]:ring-brand-600/35 ' +
  // Firefox
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none ' +
  '[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full ' +
  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface ' +
  '[&::-moz-range-thumb]:bg-brand-700 [&::-moz-range-thumb]:shadow-md ' +
  '[&::-moz-range-thumb]:cursor-grab ' +
  '[&::-moz-range-track]:bg-transparent [&::-moz-range-track]:h-1.5';

export default function PriceRange({ min, max, onChange, className }) {
  const id = useId();
  const span = PRICE_MAX - PRICE_MIN;
  const lo = ((min - PRICE_MIN) / span) * 100;
  const hi = ((max - PRICE_MIN) / span) * 100;

  // When the lower thumb is parked at the far right both thumbs sit on top of
  // each other; lifting it above the upper input keeps it draggable.
  const lowerOnTop = min > PRICE_MAX - span * 0.08;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="tabular rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
          {formatPKR(min)}
        </span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <span className="tabular rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
          {max >= PRICE_MAX ? `${formatPKR(max)}+` : formatPKR(max)}
        </span>
      </div>

      <div className="relative h-11">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600"
          style={{ left: `${lo}%`, right: `${100 - hi}%` }}
        />

        <input
          id={`${id}-min`}
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={min}
          aria-label="Minimum monthly rent"
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), max - PRICE_STEP);
            onChange({ min: Math.max(PRICE_MIN, v), max });
          }}
          className={cn(THUMB, lowerOnTop ? 'z-30' : 'z-10')}
        />
        <input
          id={`${id}-max`}
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={max}
          aria-label="Maximum monthly rent"
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), min + PRICE_STEP);
            onChange({ min, max: Math.min(PRICE_MAX, v) });
          }}
          className={cn(THUMB, 'z-20')}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Rent per person, per month. Listings match when any of their rooms fall in
        this band.
      </p>
    </div>
  );
}
