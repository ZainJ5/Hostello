'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(() => {});

/** `const toast = useToast(); toast({ title, description, tone })` */
export function useToast() {
  return useContext(ToastContext);
}

const TONES = {
  success: {
    icon: CircleCheck,
    ring: 'border-success/30',
    chip: 'bg-success-soft text-success dark:bg-success/15 dark:text-emerald-300',
  },
  danger: {
    icon: CircleX,
    ring: 'border-danger/30',
    chip: 'bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-300',
  },
  warning: {
    icon: TriangleAlert,
    ring: 'border-warning/30',
    chip: 'bg-warning-soft text-warning dark:bg-warning/15 dark:text-amber-300',
  },
  info: {
    icon: Info,
    ring: 'border-info/30',
    chip: 'bg-info-soft text-info dark:bg-info/15 dark:text-sky-300',
  },
};

export default function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input) => {
      const t = typeof input === 'string' ? { title: input } : input || {};
      const id = ++seq.current;
      setItems((prev) => [...prev.slice(-3), { id, tone: 'success', ...t }]);
      // Errors linger; confirmations get out of the way.
      const ttl = t.tone === 'danger' ? 8000 : 4500;
      setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {items.map((t) => {
          const tone = TONES[t.tone] || TONES.info;
          const Icon = tone.icon;
          return (
            <div
              key={t.id}
              role={t.tone === 'danger' ? 'alert' : 'status'}
              className={cn(
                'animate-scale-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-card)]',
                'border bg-surface-raised p-3.5 shadow-xl',
                tone.ring
              )}
            >
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', tone.chip)}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-m-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
