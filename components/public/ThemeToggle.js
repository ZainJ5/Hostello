'use client';

import { cn } from '@/lib/utils';

/** Shared with the blocking script in `app/(public)/layout.js`. */
export const THEME_STORAGE_KEY = 'hostello-theme';

/**
 * Restyled onto the 2026 tokens. The behaviour and the storage key are
 * unchanged, because this control already worked and the design file has no
 * toggle component of its own.
 *
 * The class on <html> is the source of truth. It is written by the inline
 * script before first paint, so both labels are driven by the `dark:` variant
 * alone. Server and first client render stay byte identical and there is no
 * hydration mismatch, which is why this carries no state at all.
 *
 * Presentation follows the header's theme-toggle slot: a 44 tall control with
 * a hairline keyline and a one word label naming the mode it switches to.
 */
export default function ThemeToggle({ className }) {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains('dark');
    root.classList.toggle('dark', next);
    root.style.colorScheme = next ? 'dark' : 'light';
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Private mode or disabled storage. The toggle still works this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'ds-body-s-strong inline-flex shrink-0 cursor-pointer items-center justify-center px-2.5',
        'rounded-ds-chip border border-solid border-ds-control bg-ds-surface-raised text-ds-ink',
        'transition-colors duration-150 motion-reduce:transition-none',
        'hover:border-ds-cobalt',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt',
        className
      )}
      style={{ height: 'var(--ds-control-h)' }}
    >
      <span className="dark:hidden">Dark</span>
      <span className="hidden dark:inline">Light</span>
      <span className="sr-only">Switch colour theme</span>
    </button>
  );
}
