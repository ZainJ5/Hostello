'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MAX_COMPARE, compareHref, withSlug } from './selection';

/**
 * The three controls that change the comparison: add a column, choose the
 * campus the distance row measures from, and copy the link.
 *
 * Both pickers are native selects. A directory of this size means a hundred
 * odd options, and a native select gives correct keyboard handling, a real
 * listbox to a screen reader and the platform picker on a phone. The same
 * trade the sort control makes, for the same reasons.
 *
 * Every change is a navigation, so the back button walks the comparison
 * backwards and the URL is always the state.
 */

const SLOT =
  'inline-flex rounded-ds-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt';

const FACE = cn(
  'relative flex min-w-px flex-1 items-center gap-2 overflow-hidden px-3',
  'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised',
  'hover:border-ds-cobalt focus-within:border-ds-ink'
);

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 7"
      className="size-3 shrink-0 text-ds-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M1 1l5 5 5-5" />
    </svg>
  );
}

function Picker({ id, label, value, onChange, disabled, children, className }) {
  return (
    <div className={cn('flex min-w-px flex-col gap-1.5', className)}>
      <label htmlFor={id} className="ds-body-s text-ds-ink-muted">
        {label}
      </label>
      <div className={SLOT} style={{ padding: 'var(--ds-focus-gap)' }}>
        <div className={cn(FACE, disabled && 'opacity-60')} style={{ height: 'var(--ds-control-h)' }}>
          <select
            id={id}
            value={value}
            disabled={disabled}
            onChange={onChange}
            className="ds-body-m min-w-px flex-1 cursor-pointer appearance-none bg-transparent text-ds-ink focus:outline-none disabled:cursor-not-allowed"
          >
            {children}
          </select>
          <Chevron />
        </div>
      </div>
    </div>
  );
}

export default function CompareControls({ selection, options, campuses }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const full = selection.slugs.length >= MAX_COMPARE;
  const available = options.filter((o) => !selection.slugs.includes(o.slug));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard permission can be refused. The URL is in the address bar and
      // the page says so, so there is nothing to recover from.
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <Picker
        id="compare-add"
        label={full ? `Comparing ${MAX_COMPARE}, the most that fits` : 'Add a hostel'}
        value=""
        disabled={full || available.length === 0}
        onChange={(e) => {
          if (e.target.value) router.push(withSlug(selection, e.target.value));
        }}
        className="sm:flex-1"
      >
        <option value="">Choose a hostel</option>
        {available.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name} ({o.city})
          </option>
        ))}
      </Picker>

      <Picker
        id="compare-campus"
        label="Measure distance from"
        value={selection.campus}
        onChange={(e) => router.push(compareHref({ ...selection, campus: e.target.value }))}
        className="sm:w-64"
      >
        <option value="">Whichever campus they share</option>
        {campuses.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Picker>

      <span className="inline-flex rounded-ds-control p-1 focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt">
        <button
          type="button"
          onClick={copy}
          className={cn(
            'ds-body-m-strong ds-tap inline-flex w-full items-center justify-center px-5',
            'rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
            'transition-colors duration-150 motion-reduce:transition-none',
            'hover:border-ds-cobalt hover:text-ds-cobalt focus:outline-none',
            'active:bg-ds-ink active:text-ds-on-ink'
          )}
        >
          {copied ? 'Link copied' : 'Copy this comparison'}
        </button>
      </span>
    </div>
  );
}
