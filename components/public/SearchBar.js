'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, MapPin, Search, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const GENDERS = ['Male', 'Female', 'Mixed'];

/** One segment of the pill. 56px tall, so every hit area clears 44px. */
const SEGMENT =
  'relative flex h-14 min-w-0 flex-col justify-center gap-0.5 rounded-xl px-3.5 ' +
  'transition-colors duration-200 hover:bg-muted/70 ' +
  'lg:basis-0 lg:rounded-full lg:px-5';

const CAPTION =
  'pointer-events-none flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground';

const FOCUS_RING =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-0 has-[:focus-visible]:outline-ring';

function Divider() {
  return <span aria-hidden="true" className="hidden w-px shrink-0 self-center bg-border lg:block lg:h-8" />;
}

/**
 * A native <select> laid transparently over the whole segment: the value is
 * painted by the span underneath, but the tap target is the full 56px cell and
 * the control stays a real select for keyboard and screen-reader users.
 */
function SelectSegment({ label, icon: Icon, value, onChange, placeholder, options, className }) {
  return (
    <label className={cn(SEGMENT, FOCUS_RING, 'cursor-pointer', className)}>
      <span className={CAPTION}>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </span>
      <span
        className={cn(
          'pointer-events-none truncate text-sm font-medium',
          value ? 'text-foreground' : 'text-muted-foreground/80'
        )}
      >
        {value || placeholder}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-xl border-0 bg-transparent px-3.5 text-sm text-transparent opacity-0 focus:outline-none lg:rounded-full"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The primary entry point into the directory. Everything it collects becomes a
 * query string on /hostels, so a search is always shareable and bookmarkable.
 */
export default function SearchBar({
  cities = [],
  universities = [],
  defaults = {},
  className,
}) {
  const router = useRouter();
  const queryId = useId();

  const [q, setQ] = useState(defaults.q || '');
  const [city, setCity] = useState(defaults.city || '');
  const [university, setUniversity] = useState(defaults.university || '');
  const [gender, setGender] = useState(defaults.gender || '');

  function handleSubmit(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (city) params.set('city', city);
    if (university) params.set('university', university);
    if (gender) params.set('gender', gender);
    const search = params.toString();
    router.push(search ? `/hostels?${search}` : '/hostels');
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        'grid gap-1 rounded-[var(--radius-panel)] border border-border bg-surface p-2 shadow-xl',
        'sm:grid-cols-2',
        'lg:flex lg:items-center lg:gap-0 lg:rounded-full',
        className
      )}
    >
      <label
        htmlFor={queryId}
        className={cn(SEGMENT, FOCUS_RING, 'cursor-text sm:col-span-2 lg:grow-2')}
      >
        <span className={CAPTION}>
          <Search className="size-3.5 shrink-0" aria-hidden="true" />
          Search
        </span>
        <input
          id={queryId}
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Hostel name, area or landmark"
          className="h-5 w-full min-w-0 border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground/80 focus:outline-none"
        />
      </label>

      <Divider />

      <SelectSegment
        label="City"
        icon={MapPin}
        value={city}
        onChange={setCity}
        placeholder="Any city"
        options={cities}
        className="lg:grow"
      />

      <Divider />

      <SelectSegment
        label="University"
        icon={GraduationCap}
        value={university}
        onChange={setUniversity}
        placeholder="Any campus"
        options={universities}
        className="lg:grow"
      />

      <Divider />

      <SelectSegment
        label="Gender"
        icon={Users}
        value={gender}
        onChange={setGender}
        placeholder="Any"
        options={GENDERS}
        className="sm:col-span-2 lg:col-span-1 lg:shrink-0 lg:grow-0 lg:basis-36"
      />

      <div className="sm:col-span-2 lg:ml-2 lg:w-auto lg:shrink-0">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full gap-2 sm:h-14 lg:h-14 lg:w-14 lg:rounded-full lg:px-0 xl:w-auto xl:px-7"
        >
          <Search className="size-5 shrink-0" aria-hidden="true" />
          <span className="lg:sr-only xl:not-sr-only">Search hostels</span>
        </Button>
      </div>
    </form>
  );
}
