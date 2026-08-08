'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Result feedback for every async action in the student area.
 *
 * The default context value is a working no-op so `useToast()` is safe in
 * components that also render outside the provider — `SaveButton` ships on
 * public listing pages, which are owned by another stream and mount no
 * provider of their own.
 */
const ToastContext = createContext({
  toast: () => '',
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TONES = {
  success: {
    icon: CircleCheck,
    ring: 'border-success/30',
    accent: 'text-success dark:text-emerald-300',
  },
  danger: {
    icon: CircleAlert,
    ring: 'border-danger/30',
    accent: 'text-danger dark:text-red-300',
  },
  warning: {
    icon: TriangleAlert,
    ring: 'border-warning/30',
    accent: 'text-warning dark:text-amber-300',
  },
  info: { icon: Info, ring: 'border-info/30', accent: 'text-info dark:text-sky-300' },
};

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ tone = 'info', title, description, action, duration = 5000 }) => {
      const id = `t${++seq}`;
      setToasts((list) => [...list.slice(-3), { id, tone, title, description, action }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  // Clear every pending timer if the provider unmounts mid-navigation.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }) {
  const tone = TONES[toast.tone] || TONES.info;
  const Icon = tone.icon;

  return (
    <div
      role="status"
      className={cn(
        'animate-scale-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-card)] border bg-surface p-4 shadow-lg',
        tone.ring
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', tone.accent)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              onDismiss();
              toast.action.onClick();
            }}
            className="mt-2 inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-sm font-semibold text-brand-700 transition-colors duration-200 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300 dark:hover:bg-brand-950"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default ToastProvider;
