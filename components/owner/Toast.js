'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleX, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

const TONES = {
  success: {
    icon: CircleCheck,
    className:
      'border-success/30 bg-success-soft text-success dark:bg-success/15 dark:text-emerald-300',
  },
  error: {
    icon: CircleX,
    className: 'border-danger/30 bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-300',
  },
  info: {
    icon: Info,
    className: 'border-info/30 bg-info-soft text-info dark:bg-info/15 dark:text-sky-300',
  },
};

/**
 * Result feedback for every async action in the console. Mounted once, inside
 * the owner shell, so any client descendant can call `useToast()`.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'success', { duration = 4500 } = {}) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, message, tone }]);
      if (duration > 0) {
        setTimeout(() => {
          setToasts((list) => list.filter((t) => t.id !== id));
        }, duration);
      }
      return id;
    },
    []
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (m, o) => push(m, 'success', o),
      error: (m, o) => push(m, 'error', o),
      info: (m, o) => push(m, 'info', o),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          const Icon = tone.icon;
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
                tone.className
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-pretty">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 shrink-0 cursor-pointer rounded-md p-1 opacity-70 transition-opacity duration-200 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  // Rendering a client component outside the shell (e.g. in a test) should not
  // crash, so degrade to a no-op rather than throwing.
  const noop = () => {};
  return { push: noop, dismiss: noop, success: noop, error: noop, info: noop };
}
