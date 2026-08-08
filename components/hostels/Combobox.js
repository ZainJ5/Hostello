'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Accessible single-select combobox (WAI-ARIA 1.2 pattern): editable input,
 * `aria-expanded`/`aria-controls`/`aria-activedescendant`, arrow-key roving,
 * Enter to commit, Escape to dismiss, click-outside to close.
 *
 * `options` is `[{ value, count }]` so the university list can show how many
 * listings each campus still has under the other active filters.
 */
export default function Combobox({
  label,
  placeholder = 'Search…',
  value,
  options,
  onChange,
  emptyText = 'No matches',
  className,
}) {
  const id = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    function onDocDown(e) {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`#${CSS.escape(`${id}-opt-${active}`)}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  function commit(option) {
    onChange(option ? option.value : '');
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || (e.key === 'ArrowUp' && !open)) {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
      } else {
        setActive((i) => Math.min(filtered.length - 1, i + 1));
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (filtered[active]) commit(filtered[active]);
      return;
    }
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setQuery('');
      }
      return;
    }
    if (e.key === 'Home' && open) {
      e.preventDefault();
      setActive(0);
    }
    if (e.key === 'End' && open) {
      e.preventDefault();
      setActive(filtered.length - 1);
    }
  }

  const shown = open ? query : value || '';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {label && (
        <label htmlFor={`${id}-input`} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          type="text"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[active] ? `${id}-opt-${active}` : undefined}
          value={shown}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            'h-11 w-full cursor-pointer rounded-xl border border-border bg-surface pl-3.5 pr-16 text-sm',
            'text-foreground placeholder:text-muted-foreground/70 transition-colors duration-200',
            'hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12'
          )}
        />

        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setQuery('');
              }}
              aria-label={`Clear ${label || 'selection'}`}
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => {
              setOpen((o) => !o);
              inputRef.current?.focus();
            }}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ChevronsUpDown className="size-4" />
          </button>
        </div>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label || 'Options'}
          className="absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl animate-scale-in"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">{emptyText}</li>
          )}
          {filtered.map((o, i) => {
            const selected = o.value === value;
            return (
              /* eslint-disable-next-line jsx-a11y/click-events-have-key-events */
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(o)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-100',
                  i === active ? 'bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-100' : 'text-foreground'
                )}
              >
                <Check
                  className={cn('size-4 shrink-0', selected ? 'text-brand-700 dark:text-brand-300' : 'opacity-0')}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{o.value}</span>
                {o.count !== undefined && (
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{o.count}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
