'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { CAMPUSES, CITIES, GENDERS, RADIUS_OPTIONS, UNIVERSITIES } from './config';
import { activeFilterCount } from './filters';
import PriceRange from './PriceRange';

/**
 * Every control writes straight into the URL, so any view a student reaches
 * can be pasted to a friend and land them on exactly the same map.
 *
 * The selects are built here rather than imported. `components/ui/Field` is
 * the frozen console component, and the 2026 set has no field primitive yet,
 * so this reproduces the sort control's geometry: a transparent 3px slot
 * carrying the focus ring around a 44 tall control, which is why nothing
 * reflows when a control takes focus.
 */

function Select({ label, value, onChange, children }) {
  const id = useId();

  return (
    <div className="flex min-w-px flex-col gap-1.5">
      <label htmlFor={id} className="ds-body-s text-ds-ink-muted">
        {label}
      </label>
      <div
        className="inline-flex rounded-ds-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt"
        style={{ padding: 'var(--ds-focus-gap)' }}
      >
        <div
          className={cn(
            'relative flex min-w-px flex-1 items-center gap-2 overflow-hidden px-3',
            'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised',
            'hover:border-ds-cobalt focus-within:border-ds-ink'
          )}
          style={{ height: 'var(--ds-control-h)' }}
        >
          <select
            id={id}
            value={value}
            onChange={onChange}
            className="ds-body-m min-w-px flex-1 cursor-pointer appearance-none bg-transparent text-ds-ink focus:outline-none"
          >
            {children}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 7"
            className="size-3 shrink-0 text-ds-ink"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M1 1l5 5 5-5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function FilterBar({ filters, onChange, onClear, open, onToggleOpen }) {
  const panelId = useId();
  const count = activeFilterCount(filters);
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="border-b border-solid border-ds-hairline bg-ds-surface">
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'ds-body-m-strong ds-tap inline-flex cursor-pointer items-center gap-2 px-3',
            'rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
            'transition-colors duration-150 motion-reduce:transition-none hover:border-ds-cobalt',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
          )}
        >
          Filters
          {count > 0 ? <span className="ds-mono-meta text-ds-ink-muted">{count}</span> : null}
        </button>

        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'ds-body-s ds-tap ml-auto inline-flex cursor-pointer items-center px-3',
              'rounded-ds-inner text-ds-cobalt',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
            )}
          >
            Clear {count}
          </button>
        )}
      </div>

      {open && (
        <div id={panelId} className="flex flex-col gap-4 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="City" value={filters.city} onChange={(e) => set({ city: e.target.value })}>
              <option value="">All cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>

            <Select
              label="Who can stay"
              value={filters.gender}
              onChange={(e) => set({ gender: e.target.value })}
            >
              <option value="">Anyone</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="University"
              value={filters.university}
              onChange={(e) => set({ university: e.target.value })}
            >
              <option value="">Any university</option>
              {UNIVERSITIES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>

            <Select
              label="Near campus"
              value={filters.campus}
              onChange={(e) => set({ campus: e.target.value, radius: 0 })}
            >
              <option value="">No campus</option>
              {CAMPUSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.sector}
                </option>
              ))}
            </Select>
          </div>

          {filters.campus && (
            <div className="flex flex-col gap-1.5">
              <span className="ds-body-s text-ds-ink-muted">Within</span>
              <div
                role="group"
                aria-label="Straight line distance from the selected campus"
                className="no-scrollbar flex gap-1 overflow-x-auto"
              >
                {[0, ...RADIUS_OPTIONS].map((r) => {
                  const on = filters.radius === r;
                  return (
                    <span
                      key={r}
                      className="inline-flex shrink-0 rounded-ds-chip-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt"
                      style={{ padding: 'var(--ds-focus-gap)' }}
                    >
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ radius: r })}
                        style={{ height: 'var(--ds-chip-h)' }}
                        className={cn(
                          'ds-body-s-strong inline-flex cursor-pointer items-center justify-center px-3',
                          'rounded-ds-chip border border-solid focus:outline-none',
                          'transition-colors duration-150 motion-reduce:transition-none',
                          on
                            ? 'border-ds-ink bg-ds-ink text-ds-on-ink'
                            : 'border-ds-control bg-ds-surface-raised text-ds-ink hover:border-ds-cobalt'
                        )}
                      >
                        {r === 0 ? 'Any distance' : `${r} km`}
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <PriceRange
            min={filters.minPrice}
            max={filters.maxPrice}
            onChange={(minPrice, maxPrice) => set({ minPrice, maxPrice })}
          />
        </div>
      )}
    </div>
  );
}
