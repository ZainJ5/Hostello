'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw, Search, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/**
 * All list state lives in the URL: filters survive a refresh, are shareable,
 * and every page can render on the server without a client fetch.
 */
export function useAdminQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const set = useCallback(
    (patch, { keepPage = false } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === '' || v === null || v === undefined) next.delete(k);
        else next.set(k, String(v));
      }
      // Any filter change invalidates the current page number.
      if (!keepPage && !('page' in patch)) next.delete('page');
      const qs = next.toString();
      start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router]
  );

  const toggleSort = useCallback(
    (key) => {
      const current = params.get('sort');
      const dir = params.get('dir') === 'asc' ? 'asc' : 'desc';
      set({ sort: key, dir: current === key && dir === 'desc' ? 'asc' : 'desc' });
    },
    [params, set]
  );

  const reset = useCallback(() => {
    start(() => router.push(pathname, { scroll: false }));
  }, [pathname, router]);

  return {
    params,
    get: (k, fallback = '') => params.get(k) ?? fallback,
    set,
    toggleSort,
    reset,
    pending,
  };
}

export function FilterBar({ children, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SearchBox({ value, onSearch, placeholder = 'Search…', className }) {
  const [text, setText] = useState(value || '');
  const first = useRef(true);

  useEffect(() => {
    setText(value || '');
  }, [value]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    const t = setTimeout(() => {
      if ((text || '') !== (value || '')) onSearch(text);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className={cn('relative min-w-0 flex-1 sm:max-w-xs', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={text}
        aria-label={placeholder}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch(text);
        }}
        className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText('');
            onSearch('');
          }}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options, allLabel = 'All', className }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer rounded-xl border border-border bg-surface px-3 pr-8 text-sm text-foreground transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => {
          const val = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          return (
            <option key={val} value={val}>
              {text}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function ResetFilters({ onReset, active }) {
  if (!active) return null;
  return (
    <Button variant="ghost" size="sm" onClick={onReset} className="h-10">
      <RotateCcw className="size-3.5" aria-hidden="true" />
      Reset
    </Button>
  );
}

/** Range chips used by the analytics page. Never a select — three options. */
export function RangePicker({ value, onChange, options, pending }) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5"
    >
      {options.map((o) => {
        const active = String(value) === String(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            disabled={pending && active}
            className={cn(
              'h-9 cursor-pointer rounded-lg px-3 text-sm font-medium transition-colors duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              active
                ? 'bg-brand-700 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pages, total, perPage, onPage, label = 'rows' }) {
  if (!total) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const windowed = [];
  const push = (n) => {
    if (n >= 1 && n <= pages && !windowed.includes(n)) windowed.push(n);
  };
  push(1);
  for (let n = page - 1; n <= page + 1; n++) push(n);
  push(pages);
  windowed.sort((a, b) => a - b);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
      <p className="tabular text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total.toLocaleString('en-PK')}</span> {label}
      </p>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>

          {windowed.map((n, i) => (
            <span key={n} className="flex items-center">
              {i > 0 && windowed[i - 1] !== n - 1 && (
                <span className="px-1 text-xs text-muted-foreground" aria-hidden="true">
                  …
                </span>
              )}
              <button
                type="button"
                aria-current={n === page ? 'page' : undefined}
                onClick={() => onPage(n)}
                className={cn(
                  'tabular grid h-9 min-w-9 cursor-pointer place-items-center rounded-lg px-2 text-sm transition-colors duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  n === page
                    ? 'bg-brand-700 font-semibold text-white'
                    : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {n}
              </button>
            </span>
          ))}

          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}

/** Dims the list while a navigation is in flight — never a skeleton flash. */
export function PendingOverlay({ pending, children }) {
  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        pending && 'pointer-events-none opacity-55'
      )}
      aria-busy={pending || undefined}
    >
      {children}
    </div>
  );
}
