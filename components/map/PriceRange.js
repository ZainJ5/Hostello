'use client';

import { PRICE_CEIL, PRICE_FLOOR, PRICE_STEP } from './config';
import { formatPKR } from '@/lib/utils';

const span = PRICE_CEIL - PRICE_FLOOR;
const pct = (v) => ((v - PRICE_FLOOR) / span) * 100;

function label(min, max) {
  if (min <= PRICE_FLOOR && max >= PRICE_CEIL) return 'Any budget';
  if (min <= PRICE_FLOOR) return `Up to ${formatPKR(max)}`;
  if (max >= PRICE_CEIL) return `${formatPKR(min)} and above`;
  return `${formatPKR(min)} to ${max.toLocaleString('en-PK')}`;
}

/**
 * Two native range inputs stacked on one track: real keyboard support and real
 * screen reader semantics, which a div and a pointerdown handler cannot give.
 * The track itself ignores pointer events so only the thumbs are grabbable.
 *
 * The thumbs are yellow with an ink keyline, because they are the control and
 * yellow only ever appears on the thing being acted on. The keyline is what
 * makes a yellow thumb perceivable on a white track at all.
 */
export default function PriceRange({ min, max, onChange }) {
  // When both thumbs sit at the top of the range the upper input would swallow
  // every drag, so the lower one is raised once it passes the midpoint.
  const minOnTop = min > span * 0.6;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="ds-body-s text-ds-ink-muted">Monthly rent</span>
        <span className="ds-body-s-strong tabular-nums text-ds-ink">{label(min, max)}</span>
      </div>

      <div className="relative h-5">
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-ds-chip bg-ds-surface-sunken" />
        <span
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-ds-chip bg-ds-ink"
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

      <div className="ds-mono-meta flex justify-between text-ds-ink-muted">
        <span>{PRICE_FLOOR.toLocaleString('en-PK')}</span>
        <span>{PRICE_CEIL.toLocaleString('en-PK')} and above</span>
      </div>
    </div>
  );
}
