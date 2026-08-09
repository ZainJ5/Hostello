'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Form controls for the two public forms this group owns: write a review and
 * report a listing.
 *
 * `components/ds` has no text input, because the browse chrome only needed a
 * select and a segmented toggle. These follow the same grammar the ds controls
 * already use, so nothing new is being invented:
 *
 *   a transparent slot carries the focus ring, so the control never changes
 *   size between states; the slot is radius 7 and the control inside is
 *   radius 4; the control is at least 44 tall; and the keyline is the ink
 *   control line, shifting to cobalt on hover and focus.
 *
 * The focus ring is drawn on the slot with `focus-within`, which is exactly
 * how ds/Button does it.
 */

const SLOT =
  'flex rounded-ds-slot p-[var(--ds-focus-gap)] focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt';

const CONTROL =
  'ds-body-m w-full rounded-ds-inner border border-solid bg-ds-surface-raised px-3 text-ds-ink ' +
  'placeholder:text-ds-ink-muted focus:outline-none ' +
  'transition-colors duration-150 motion-reduce:transition-none';

function tone(invalid, disabled) {
  if (disabled) return 'border-ds-hairline bg-ds-surface-sunken text-ds-ink-muted cursor-not-allowed';
  if (invalid) return 'border-ds-error hover:border-ds-error';
  return 'border-ds-control hover:border-ds-cobalt';
}

function Shell({ id, label, hint, error, children, optional }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="ds-body-m-strong text-ds-ink">
        {label}
        {optional ? <span className="ds-body-s text-ds-ink-muted"> (optional)</span> : null}
      </label>

      {children}

      {error ? (
        <p id={`${id}-error`} role="alert" className="ds-body-s text-ds-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="ds-body-s text-ds-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ label, hint, error, optional, className, ...props }) {
  const auto = useId();
  const id = props.id || auto;

  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional}>
      <span className={SLOT}>
        <input
          {...props}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            CONTROL,
            'h-[var(--ds-control-h)]',
            tone(Boolean(error), props.disabled),
            className
          )}
        />
      </span>
    </Shell>
  );
}

export function TextArea({ label, hint, error, optional, rows = 5, className, ...props }) {
  const auto = useId();
  const id = props.id || auto;

  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional}>
      <span className={SLOT}>
        <textarea
          {...props}
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(CONTROL, 'resize-y py-2.5', tone(Boolean(error), props.disabled), className)}
        />
      </span>
    </Shell>
  );
}

/**
 * A radio drawn as a full width card, which is what the report listing and
 * write a review frames both use.
 *
 * The real `input` stays in the DOM and only its painted box is replaced, so
 * arrow key navigation inside the group, the required state and the label
 * association all keep working. Selected fills the box with ink, matching the
 * solid versus hollow grammar the badge and the bed strip already carry.
 */
export function ChoiceCard({ name, value, checked, onChange, title, note, disabled }) {
  const auto = useId();
  const id = `${name}-${auto}`;

  return (
    <span className={cn(SLOT, 'w-full')}>
      <label
        htmlFor={id}
        className={cn(
          'ds-tap flex w-full cursor-pointer items-start gap-3 rounded-ds-inner border border-solid',
          'bg-ds-surface-raised px-4 py-3',
          'transition-colors duration-150 motion-reduce:transition-none',
          disabled
            ? 'cursor-not-allowed border-ds-hairline bg-ds-surface-sunken'
            : checked
              ? 'border-ds-ink'
              : 'border-ds-hairline hover:border-ds-cobalt'
        )}
      >
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={() => onChange?.(value)}
          className="sr-only"
        />

        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 size-4 shrink-0 rounded-ds-chip border border-solid',
            checked ? 'border-ds-ink bg-ds-ink' : 'border-ds-control bg-ds-surface-raised'
          )}
        />

        <span className="flex min-w-px flex-col gap-0.5">
          <span className={cn('ds-body-m-strong', disabled ? 'text-ds-ink-muted' : 'text-ds-ink')}>
            {title}
          </span>
          {note ? <span className="ds-body-s text-ds-ink-muted">{note}</span> : null}
        </span>
      </label>
    </span>
  );
}

/** Groups the cards and carries the legend, the error and the required state. */
export function ChoiceGroup({ legend, error, children, className }) {
  return (
    <fieldset className={cn('flex w-full flex-col gap-1.5', className)}>
      <legend className="ds-body-m-strong mb-1.5 text-ds-ink">{legend}</legend>
      <div className="flex flex-col gap-2">{children}</div>
      {error ? (
        <p role="alert" className="ds-body-s mt-1 text-ds-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
