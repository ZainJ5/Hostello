'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Per DESIGN.md: 8px radius, hairline outline, and on focus the border
 * thickens to 2px ink, with no glow and no ring. `inset` box-shadow supplies the
 * second pixel so the control never shifts by 1px when focused.
 */
const CONTROL =
  'w-full rounded-lg border border-border bg-surface px-3.5 text-base text-foreground ' +
  'placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 ' +
  'hover:border-border-strong focus:border-foreground focus:outline-none ' +
  'focus:shadow-[inset_0_0_0_1px_var(--foreground)] ' +
  'disabled:bg-surface-sunken disabled:opacity-60 disabled:cursor-not-allowed';

const INVALID =
  'border-danger focus:border-danger focus:shadow-[inset_0_0_0_1px_var(--color-danger)]';

/**
 * Wraps a control with a persistent visible label, optional hint, and an
 * inline error rendered directly beneath the field it belongs to.
 * Placeholders are never used as the label.
 */
export function Field({ label, hint, error, required, htmlFor, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-start gap-1 text-xs text-danger" role="alert">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ label, hint, error, className, id, ...props }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
    >
      <input
        id={fieldId}
        className={cn(CONTROL, 'h-12', error && INVALID, className)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
    </Field>
  );
}

export function Textarea({ label, hint, error, className, id, rows = 4, ...props }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
    >
      <textarea
        id={fieldId}
        rows={rows}
        className={cn(CONTROL, 'py-2.5 resize-y leading-relaxed', error && INVALID, className)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
    </Field>
  );
}

export function Select({ label, hint, error, className, id, children, ...props }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
    >
      <div className="relative">
        <select
          id={fieldId}
          className={cn(
            CONTROL,
            'h-12 appearance-none pr-10 cursor-pointer',
            error && INVALID,
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        >
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  );
}

export function Checkbox({ label, description, className, id, ...props }) {
  const auto = useId();
  const fieldId = id || auto;
  return (
    <label
      htmlFor={fieldId}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3',
        'transition-colors duration-200 hover:border-border-strong hover:bg-muted/50',
        'has-checked:border-brand-500 has-checked:bg-brand-50 dark:has-checked:bg-brand-950/40',
        className
      )}
    >
      <input
        id={fieldId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-brand-500"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        )}
      </span>
    </label>
  );
}
