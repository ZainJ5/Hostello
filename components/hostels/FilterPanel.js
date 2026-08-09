'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Combobox from './Combobox';
import PriceRange from './PriceRange';
import { facilityIcon } from './facility-icons';
import { GENDERS } from './filters';

/**
 * Controlled filter form. It owns no URL state of its own: the desktop rail
 * pushes every change straight to the router and the mobile sheet buffers
 * changes until "Show results", so both surfaces render identical controls.
 *
 * `value`  : parsed filter object
 * `onChange`: (patch, meta) => void, where meta.debounce hints how long the
 *             caller should wait before navigating (text needs ~300ms).
 */
export default function FilterPanel({ value, facets, onChange, className }) {
  const searchId = useId();
  const [showAllFacilities, setShowAllFacilities] = useState(
    () => (value.facilities?.length || 0) > 0
  );

  const cityCounts = useMemo(
    () => new Map((facets?.cities || []).map((c) => [c.value, c.count])),
    [facets]
  );
  const facilityCounts = useMemo(
    () => new Map((facets?.facilities || []).map((f) => [f.value, f.count])),
    [facets]
  );
  const genderCounts = useMemo(
    () => new Map((facets?.genders || []).map((g) => [g.value, g.count])),
    [facets]
  );

  // Cities always render every known option, so a zero-count city stays
  // visible (disabled) instead of vanishing mid-interaction.
  const cities = useMemo(() => {
    const known = new Set([...(facets?.cities || []).map((c) => c.value), ...(value.city || [])]);
    return [...known].sort(
      (a, b) => (cityCounts.get(b) || 0) - (cityCounts.get(a) || 0) || a.localeCompare(b)
    );
  }, [facets, value.city, cityCounts]);

  const universityOptions = useMemo(() => {
    const opts = [...(facets?.universities || [])];
    if (value.university && !opts.some((o) => o.value === value.university)) {
      opts.unshift({ value: value.university, count: 0 });
    }
    return opts;
  }, [facets, value.university]);

  // `facets.facilities` arrives padded with the model's full vocabulary, so
  // this covers every option without the client importing a mongoose model.
  const orderedFacilities = useMemo(() => {
    const selected = new Set(value.facilities || []);
    const names = new Set([...(facets?.facilities || []).map((f) => f.value), ...selected]);
    return [...names].sort((a, b) => {
      const sa = selected.has(a) ? 1 : 0;
      const sb = selected.has(b) ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return (facilityCounts.get(b) || 0) - (facilityCounts.get(a) || 0) || a.localeCompare(b);
    });
  }, [value.facilities, facets, facilityCounts]);

  const visibleFacilities = showAllFacilities ? orderedFacilities : orderedFacilities.slice(0, 8);

  function toggleCity(city) {
    const set = new Set(value.city || []);
    if (set.has(city)) set.delete(city);
    else set.add(city);
    onChange({ city: [...set] });
  }

  function toggleFacility(fac) {
    const set = new Set(value.facilities || []);
    if (set.has(fac)) set.delete(fac);
    else set.add(fac);
    onChange({ facilities: [...set] });
  }

  return (
    <div className={cn('space-y-7', className)}>
      {/* ── Search ── */}
      <section>
        <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium text-foreground">
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            value={value.q}
            placeholder="Name, area or sector…"
            onChange={(e) => onChange({ q: e.target.value }, { debounce: 300 })}
            className={cn(
              'h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-10 text-sm text-foreground',
              'placeholder:text-muted-foreground/70 transition-colors duration-200',
              'hover:border-border-strong focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/12',
              '[&::-webkit-search-cancel-button]:hidden'
            )}
          />
          {value.q && (
            <button
              type="button"
              onClick={() => onChange({ q: '' })}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {/* ── City ── */}
      <FilterSection title="City">
        <ul className="space-y-1">
          {cities.map((city) => {
            const count = cityCounts.get(city) ?? 0;
            const checked = (value.city || []).includes(city);
            const disabled = count === 0 && !checked;
            return (
              <li key={city}>
                <label
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150',
                    disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-muted',
                    checked && 'bg-brand-50/70 dark:bg-brand-950/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleCity(city)}
                    className="size-4 shrink-0 cursor-pointer accent-brand-700 disabled:cursor-not-allowed"
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">{city}</span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      {/* ── University ── */}
      <FilterSection title="University">
        <Combobox
          placeholder="Any university"
          value={value.university}
          options={universityOptions}
          onChange={(v) => onChange({ university: v })}
          emptyText="No campus matches that"
        />
      </FilterSection>

      {/* ── Gender ── */}
      <FilterSection title="Hostel for">
        <div
          role="radiogroup"
          aria-label="Hostel for"
          className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1"
        >
          {[{ value: '', label: 'Any' }, ...GENDERS.map((g) => ({ value: g, label: g }))].map(
            (opt) => {
              const selected = value.gender === opt.value;
              const count = opt.value ? genderCounts.get(opt.value) : undefined;
              return (
                <button
                  key={opt.value || 'any'}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ gender: opt.value })}
                  className={cn(
                    'h-11 cursor-pointer rounded-lg px-1 text-xs font-medium transition-all duration-200',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    selected
                      ? 'bg-surface text-brand-800 shadow-sm dark:text-brand-200'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="block truncate">{opt.label}</span>
                  {count !== undefined && (
                    <span className="tabular block text-[10px] font-normal opacity-70">{count}</span>
                  )}
                </button>
              );
            }
          )}
        </div>
      </FilterSection>

      {/* ── Price ── */}
      <FilterSection title="Monthly rent">
        <PriceRange
          min={value.minPrice}
          max={value.maxPrice}
          onChange={({ min, max }) =>
            onChange({ minPrice: min, maxPrice: max }, { debounce: 350 })
          }
        />
      </FilterSection>

      {/* ── Facilities ── */}
      <FilterSection title="Facilities">
        <ul className="space-y-1">
          {visibleFacilities.map((fac) => {
            const Icon = facilityIcon(fac);
            const count = facilityCounts.get(fac) ?? 0;
            const checked = (value.facilities || []).includes(fac);
            const disabled = count === 0 && !checked;
            return (
              <li key={fac}>
                <label
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150',
                    disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-muted',
                    checked && 'bg-brand-50/70 dark:bg-brand-950/50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleFacility(fac)}
                    className="size-4 shrink-0 cursor-pointer accent-brand-700 disabled:cursor-not-allowed"
                  />
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      checked ? 'text-brand-700 dark:text-brand-300' : 'text-muted-foreground'
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">{fac}</span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{count}</span>
                </label>
              </li>
            );
          })}
        </ul>

        {orderedFacilities.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllFacilities((s) => !s)}
            aria-expanded={showAllFacilities}
            className="mt-2 inline-flex h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand-700 transition-colors duration-150 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-brand-300"
          >
            {showAllFacilities ? 'Show less' : `Show all ${orderedFacilities.length}`}
            <ChevronDown
              className={cn('size-4 transition-transform duration-200', showAllFacilities && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        )}
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <section className="border-t border-border pt-6">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}
