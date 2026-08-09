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
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Result feedback for every async action in the student area.
 *
 * The default context value is a working no-op so `useToast()` is safe in
 * components that also render outside the provider. `SaveButton` ships on
 * public listing pages, which mount no provider of their own.
 */
const ToastContext = createContext({
  toast: () => '',
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/**
 * The 2026 palette carries one status colour, `error`, so a toast is not
 * colour coded four ways. `danger` takes the error keyline and an error
 * coloured title; every other tone is an ordinary surface with an ink title.
 * The title always says what happened in words, which is what the reading
 * depends on. The tone names are unchanged, because callers outside the
 * account area pass them.
 */
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
  const isError = toast.tone === 'danger';

  return (
    <div
      role="status"
      className={cn(
        'animate-scale-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-ds-inner border border-solid bg-ds-surface-raised p-4',
        isError ? 'border-ds-error' : 'border-ds-hairline'
      )}
      style={{ boxShadow: 'var(--ds-shadow-menu)' }}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('ds-body-m-strong', isError ? 'text-ds-error' : 'text-ds-ink')}>
          {toast.title}
        </p>
        {toast.description ? (
          <p className="ds-body-s mt-0.5 text-pretty text-ds-ink-muted">
            {toast.description}
          </p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              onDismiss();
              toast.action.onClick();
            }}
            className="ds-body-m-strong ds-tap inline-flex cursor-pointer items-center justify-start rounded-ds-inner text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-ds-inner text-ds-ink-muted transition-colors duration-150 hover:text-ds-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ds-cobalt motion-reduce:transition-none"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default ToastProvider;
