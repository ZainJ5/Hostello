'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Figma input/field 79:1389: a label in label case, a transparent 3px slot
 * carrying the focus ring, the control inside it at radius 4 with a 1px
 * keyline, and a hint underneath.
 *
 * WHY THIS LIVES HERE AND NOT IN components/ds. The design system has no form
 * field yet, and `components/ds` is not this agent's to extend. Every value
 * below is the shared control pattern already recorded for buttons, chips and
 * the sort select, so a field added centrally later can replace this file
 * without any page changing. Flagged in the handover.
 *
 * The keyline moves hairline to cobalt on hover and to ink on focus, which is
 * the same progression every other control in the system uses, and the slot
 * means focus never changes the size of the control so a form cannot reflow
 * as you tab through it.
 *
 * An error is stated in words and marked with `aria-describedby`, never by
 * colour alone.
 */

function Shell({ id, label, hint, error, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex w-full flex-col">
      <label htmlFor={id} className="ds-label text-ds-ink-muted">
        {label}
      </label>

      <div
        className={cn(
          'mt-1.5 flex w-full rounded-ds-slot',
          'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt'
        )}
        style={{ padding: 'var(--ds-focus-gap)' }}
      >
        {children({ hintId, errorId })}
      </div>

      {error ? (
        <p id={errorId} className="ds-body-s mt-1.5 text-ds-error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="ds-body-s mt-1.5 text-ds-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const BOX =
  'ds-body-m w-full min-w-px rounded-ds-inner border border-solid bg-ds-surface-raised px-3 ' +
  'text-ds-ink placeholder:text-ds-ink-muted focus:outline-none ' +
  'transition-colors duration-150 motion-reduce:transition-none';

function tone(error, disabled) {
  if (disabled) return 'border-ds-hairline bg-ds-surface-sunken text-ds-ink-muted cursor-not-allowed';
  if (error) return 'border-ds-error hover:border-ds-error focus:border-ds-error';
  return 'border-ds-control hover:border-ds-cobalt focus:border-ds-ink';
}

export function Input({ label, hint, error, id, className, ...props }) {
  const auto = useId();
  const fieldId = id || auto;

  return (
    <Shell id={fieldId} label={label} hint={hint} error={error}>
      {({ hintId, errorId }) => (
        <input
          id={fieldId}
          className={cn(BOX, tone(error, props.disabled), className)}
          style={{ height: 'var(--ds-control-h)' }}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || hintId}
          {...props}
        />
      )}
    </Shell>
  );
}

export function Textarea({ label, hint, error, id, rows = 4, className, ...props }) {
  const auto = useId();
  const fieldId = id || auto;

  return (
    <Shell id={fieldId} label={label} hint={hint} error={error}>
      {({ hintId, errorId }) => (
        <textarea
          id={fieldId}
          rows={rows}
          className={cn(BOX, tone(error, props.disabled), 'resize-y py-3', className)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || hintId}
          {...props}
        />
      )}
    </Shell>
  );
}

export function Select({ label, hint, error, id, children, className, ...props }) {
  const auto = useId();
  const fieldId = id || auto;

  return (
    <Shell id={fieldId} label={label} hint={hint} error={error}>
      {({ hintId, errorId }) => (
        <select
          id={fieldId}
          className={cn(BOX, tone(error, props.disabled), 'cursor-pointer', className)}
          style={{ height: 'var(--ds-control-h)' }}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || hintId}
          {...props}
        >
          {children}
        </select>
      )}
    </Shell>
  );
}
