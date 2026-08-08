'use client';

import { useId } from 'react';
import { ChevronDown, GraduationCap, SlidersHorizontal, X } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import { cn } from '@/lib/utils';
import { CAMPUSES, CITIES, GENDERS, RADIUS_OPTIONS, UNIVERSITIES } from './config';
import { activeFilterCount } from './filters';
import PriceRange from './PriceRange';

/**
 * Every control writes straight into the URL, so any view a student reaches
 * can be pasted to a friend and land them on exactly the same map.
 */
export default function FilterBar({ filters, onChange, onClear, open, onToggleOpen }) {
  const panelId = useId();
  const count = activeFilterCount(filters);
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold',
            'text-foreground transition-colors duration-200 hover:bg-muted',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          )}
        >
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
          Filters
          {count > 0 && (
            <Badge tone="brand" size="sm" className="tabular">
              {count}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>

        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'ml-auto inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3',
              'text-sm font-medium text-muted-foreground transition-colors duration-200',
              'hover:bg-muted hover:text-foreground',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
            )}
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      {open && (
        <div id={panelId} className="space-y-3.5 px-3 pb-4 sm:px-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="City"
              value={filters.city}
              onChange={(e) => set({ city: e.target.value })}
            >
              <option value="">All cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>

            <Select
              label="Gender"
              value={filters.gender}
              onChange={(e) => set({ gender: e.target.value })}
            >
              <option value="">Any</option>
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
                  {c.name} — {c.sector}
                </option>
              ))}
            </Select>
          </div>

          {filters.campus && (
            <div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <GraduationCap className="size-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />
                Within
              </span>
              <div
                role="group"
                aria-label="Distance from the selected campus"
                className="no-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto"
              >
                {[0, ...RADIUS_OPTIONS].map((r) => {
                  const on = filters.radius === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ radius: r })}
                      className={cn(
                        'h-11 shrink-0 cursor-pointer rounded-xl border px-3.5 text-xs font-semibold',
                        'transition-[background-color,border-color,color] duration-200',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        on
                          ? 'border-brand-600 bg-brand-700 text-white'
                          : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground'
                      )}
                    >
                      {r === 0 ? 'Any distance' : `${r} km`}
                    </button>
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
