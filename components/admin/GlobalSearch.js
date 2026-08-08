'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CalendarCheck, LoaderCircle, Search, Users } from 'lucide-react';
import { apiGet } from '@/components/admin/client';
import { cn } from '@/lib/utils';

const GROUPS = [
  { key: 'hostels', label: 'Listings', icon: Building2 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
];

export default function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const abortRef = useRef(null);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [cursor, setCursor] = useState(0);

  // Flattened so arrow keys walk across groups, not within one.
  const flat = useMemo(() => {
    if (!results) return [];
    return GROUPS.flatMap((g) =>
      (results[g.key] || []).map((item) => ({ ...item, group: g.key, groupLabel: g.label }))
    );
  }, [results]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await apiGet(`/api/admin/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      });
      if (res.aborted) return;
      setLoading(false);
      setResults(res.ok ? res.data : { hostels: [], users: [], bookings: [] });
      setCursor(0);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = useCallback(
    (item) => {
      if (!item) return;
      setOpen(false);
      setQ('');
      setResults(null);
      router.push(item.href);
    },
    [router]
  );

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flat.length) go(flat[cursor]);
      else if (q.trim()) {
        setOpen(false);
        router.push(`/admin/listings?q=${encodeURIComponent(q.trim())}`);
      }
    }
  };

  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1 sm:max-w-md">
      <label htmlFor="admin-global-search" className="sr-only">
        Search listings, users and bookings
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id="admin-global-search"
        ref={inputRef}
        type="search"
        value={q}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="admin-search-results"
        aria-autocomplete="list"
        placeholder="Search listings, users, bookings…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-xl border border-border bg-surface-sunken pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors duration-200 hover:border-border-strong focus:border-brand-600 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand-600/12"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
        Ctrl K
      </kbd>

      {showPanel && (
        <div
          id="admin-search-results"
          role="listbox"
          className="animate-scale-in absolute left-0 right-0 top-full z-50 mt-2 max-h-[70dvh] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface-raised p-1.5 shadow-xl"
        >
          {loading && (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Searching…
            </p>
          )}

          {!loading && flat.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Nothing matched “{q.trim()}”.
            </p>
          )}

          {!loading &&
            GROUPS.map((g) => {
              const rows = results?.[g.key] || [];
              if (!rows.length) return null;
              const Icon = g.icon;
              return (
                <div key={g.key} className="py-1">
                  <p className="px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {g.label}
                  </p>
                  {rows.map((item) => {
                    const index = flat.findIndex(
                      (f) => f.group === g.key && f.href === item.href
                    );
                    const active = index === cursor;
                    return (
                      <button
                        key={`${g.key}-${item.href}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => go({ ...item, group: g.key })}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                          active ? 'bg-muted' : 'hover:bg-muted/70'
                        )}
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
