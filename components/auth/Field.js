'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Form controls for the 2026 student site.
 *
 * There is no field primitive in `components/ds` yet, so these live here and
 * follow the control conventions the design system already documents on
 * input/sort 74:117: a transparent 3px slot at radius 7 carries the focus ring
 * so the control never changes size between states, and the control inside is
 * 44 tall at radius 4 with a 1px keyline.
 *
 * Seven states, all on the keyline rather than on the fill, because a yellow
 * or tinted fill behind typed text is the one thing that reliably fails
 * contrast here:
 *
 *   default   hairline weight keyline in `control`
 *   hover     keyline shifts to cobalt
 *   focus     keyline shifts to ink and the slot shows a 2px cobalt ring
 *   filled    same as default; the value carries the state
 *   invalid   keyline and message in `error`, plus aria-invalid
 *   disabled  sunken fill, muted ink, keyline drops to hairline
 *   readonly  sunken fill, full ink, still focusable and still copyable
 *
 * When a field primitive is promoted into `components/ds`, this file is the
 * shape it should take. See the note in IMPLEMENTATION_NOTES.
 */

/** Shared keyline behaviour for anything that sits inside a focus slot. */
export const CONTROL_FACE = cn(
  'ds-body-m w-full rounded-ds-inner border border-solid bg-ds-surface-raised px-3 text-ds-ink',
  'placeholder:text-ds-ink-muted',
  'transition-colors duration-150 motion-reduce:transition-none',
  'focus:outline-none',
  'border-ds-control hover:border-ds-cobalt focus:border-ds-ink',
  'read-only:bg-ds-surface-sunken',
  'disabled:cursor-not-allowed disabled:border-ds-hairline disabled:bg-ds-surface-sunken disabled:text-ds-ink-muted'
);

/** The transparent slot. Carries the ring so the control never resizes. */
export function FocusSlot({ children, className }) {
  return (
    <div
      className={cn(
        'flex w-full rounded-ds-slot',
        'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt',
        className
      )}
      style={{ padding: 'var(--ds-focus-gap)' }}
    >
      {children}
    </div>
  );
}

/**
 * Label, control, hint and message. The hint is always rendered when given, so
 * the answer to "what goes in here" does not disappear the moment the field is
 * wrong. The error replaces nothing; it is added below.
 */
export function Field({ id, label, hint, error, required, children, className, action }) {
  const auto = useId();
  const fieldId = id || auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="ds-body-s-strong text-ds-ink">
          {label}
          {required ? (
            <span className="text-ds-ink-muted"> (required)</span>
          ) : null}
        </label>
        {action}
      </div>

      {typeof children === 'function'
        ? children({
            id: fieldId,
            'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
            'aria-invalid': error ? 'true' : undefined,
          })
        : children}

      {error ? (
        <p id={errorId} role="alert" className="ds-body-s text-ds-error">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="ds-body-s text-ds-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ label, hint, error, id, className, required, ...props }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {(field) => (
        <FocusSlot>
          <input
            {...field}
            {...props}
            required={required}
            className={cn(CONTROL_FACE, error && 'border-ds-error hover:border-ds-error', className)}
            style={{ height: 'var(--ds-control-h)' }}
          />
        </FocusSlot>
      )}
    </Field>
  );
}

export function SelectInput({ label, hint, error, id, className, required, children, ...props }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {(field) => (
        <FocusSlot>
          <span className="relative flex w-full">
            {/* Native select: correct keyboard handling, a real listbox to a
                screen reader, and the platform picker on a phone. */}
            <select
              {...field}
              {...props}
              required={required}
              className={cn(
                CONTROL_FACE,
                'cursor-pointer appearance-none pr-9',
                error && 'border-ds-error hover:border-ds-error',
                className
              )}
              style={{ height: 'var(--ds-control-h)' }}
            >
              {children}
            </select>
            {/* Drawn rather than a background image, so the mark takes its
                colour from the token layer in both modes. */}
            <svg
              aria-hidden="true"
              viewBox="0 0 12 8"
              className="pointer-events-none absolute right-3 top-1/2 h-2 w-3 -translate-y-1/2 text-ds-ink-muted"
            >
              <path
                d="M1 1.5 6 6.5 11 1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
        </FocusSlot>
      )}
    </Field>
  );
}

export function TextArea({ label, hint, error, id, className, required, rows = 5, ...props }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      {(field) => (
        <FocusSlot>
          <textarea
            {...field}
            {...props}
            rows={rows}
            required={required}
            className={cn(
              CONTROL_FACE,
              'py-2.5',
              error && 'border-ds-error hover:border-ds-error',
              className
            )}
          />
        </FocusSlot>
      )}
    </Field>
  );
}
