'use client';

import { GraduationCap, Building2, Check, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  {
    value: 'student',
    icon: GraduationCap,
    title: "I'm a student",
    description: 'Search hostels near your campus, save shortlists and book a room.',
  },
  {
    value: 'owner',
    icon: Building2,
    title: "I'm a hostel owner",
    description: 'List your hostel, answer enquiries and fill your empty beds.',
  },
];

/**
 * Two selectable cards backed by native radios: they are visually hidden but
 * still receive focus, so arrow keys move between the cards and Space selects,
 * exactly as a screen reader user expects from a radio group.
 */
export default function RolePicker({
  value,
  onChange,
  error,
  disabled = false,
  name = 'role',
  legend = "I'm signing up as",
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 block text-sm font-medium text-foreground">{legend}</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value: optionValue, icon: Icon, title, description }) => {
          const selected = value === optionValue;
          return (
            <label
              key={optionValue}
              className={cn(
                'group relative flex cursor-pointer flex-col rounded-[var(--radius-card)] border p-4',
                'transition-[border-color,background-color,box-shadow] duration-200',
                selected
                  ? 'border-brand-600 bg-brand-50 shadow-brand dark:bg-brand-950/50'
                  : 'border-border bg-surface hover:border-border-strong hover:bg-muted/40',
                error && !selected && 'border-danger/60'
              )}
            >
              <input
                type="radio"
                name={name}
                value={optionValue}
                checked={selected}
                onChange={() => onChange?.(optionValue)}
                className="peer sr-only"
              />
              {/* Focus ring lives on an overlay so it traces the card, not the
                  visually hidden radio. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-[var(--radius-card)] opacity-0 outline-2 outline-offset-2 outline-ring peer-focus-visible:opacity-100"
              />

              <span className="flex items-start justify-between gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-200',
                    selected
                      ? 'bg-brand-600 text-white'
                      : 'bg-muted text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200',
                    selected
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-border-strong text-transparent'
                  )}
                >
                  <Check className="size-3" strokeWidth={3.5} />
                </span>
              </span>

              <span className="mt-3 block text-sm font-semibold text-foreground">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-pretty text-muted-foreground">
                {description}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger" role="alert">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
