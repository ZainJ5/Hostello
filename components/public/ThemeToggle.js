'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared with the blocking script in `app/(public)/layout.js`. */
export const THEME_STORAGE_KEY = 'hostello-theme';

/**
 * The class on <html> is the source of truth. It is written by the inline
 * script before first paint, so both icons can be driven by the `dark:`
 * variant alone. That keeps the server and first client render byte-identical
 * and avoids a hydration mismatch; only the label needs state.
 */
export default function ThemeToggle({ className }) {
  const [isDark, setIsDark] = useState(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

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
    setIsDark(next);
  }

  const label =
    isDark === null
      ? 'Switch colour theme'
      : isDark
        ? 'Switch to light theme'
        : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cn(
        'relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl',
        'text-muted-foreground transition-colors duration-200',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
    >
      <Sun
        aria-hidden="true"
        className="size-5 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0"
      />
      <Moon
        aria-hidden="true"
        className="absolute size-5 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100"
      />
    </button>
  );
}
