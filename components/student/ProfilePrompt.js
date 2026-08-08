'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { GraduationCap, X } from 'lucide-react';

const KEY = 'hostello:profile-prompt-dismissed';

/**
 * Dismissal lives in localStorage rather than on the account: it costs no
 * write, and the prompt quietly returns on a new device where the profile is
 * still thin.
 *
 * Read through `useSyncExternalStore` so the server snapshot is "dismissed" —
 * the prompt is absent from the HTML and appears on hydration only when it
 * really should. Reading in an effect instead would either flash the banner in
 * for people who already dismissed it, or trigger a cascading render.
 */
const listeners = new Set();
let cached = null;

function getSnapshot() {
  if (cached === null) {
    try {
      cached = window.localStorage.getItem(KEY) === '1';
    } catch {
      cached = false; // Private mode — showing it is the safer default.
    }
  }
  return cached;
}

function getServerSnapshot() {
  return true;
}

function subscribe(onChange) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function dismiss() {
  cached = true;
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    /* nothing to persist to — the prompt just returns next visit */
  }
  listeners.forEach((l) => l());
}

export default function ProfilePrompt({ missing = [] }) {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (dismissed) return null;

  const what =
    missing.length === 2
      ? 'your university and city'
      : `your ${missing[0] === 'university' ? 'university' : 'city'}`;

  return (
    <div className="animate-fade-in relative overflow-hidden rounded-[var(--radius-panel)] border border-brand-200 bg-brand-50 p-5 sm:p-6 dark:border-brand-900 dark:bg-brand-950/50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-800/20"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
          <GraduationCap className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pr-8">
          <h2 className="text-base font-semibold text-brand-900 dark:text-brand-100">
            Finish your profile for better matches
          </h2>
          <p className="mt-1 text-sm text-brand-800/90 text-pretty dark:text-brand-200/80">
            Add {what} and we&apos;ll put hostels near your campus at the top of every
            list — and pre-fill your details on booking requests.
          </p>
        </div>
        <Link
          href="/dashboard/profile"
          className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-medium text-white shadow-sm transition-[background-color,box-shadow] duration-200 hover:bg-brand-800 hover:shadow-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Complete profile
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss profile reminder"
        className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-lg text-brand-700/70 transition-colors duration-200 hover:bg-brand-100 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300/70 dark:hover:bg-brand-900 dark:hover:text-brand-100"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
