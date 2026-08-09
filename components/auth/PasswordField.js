'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { CONTROL_FACE, Field } from './Field';

/**
 * Password input with a show/hide toggle.
 *
 * The toggle is a 44 square button laid over the right edge of the control. It
 * is labelled for its action ("Show password" / "Hide password") and carries
 * aria-pressed, so a screen reader announces the state rather than the icon.
 *
 * The focus ring on the slot fires for the input only, not for anything inside
 * the field, so focusing the toggle shows one ring on the toggle rather than
 * two concentric ones. The eye is drawn from a stroke that takes its colour
 * from the token layer, so it flips with the mode like every other mark.
 */

function EyeIcon({ off }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-5"
    >
      <path d="M1.5 10S4.9 4.5 10 4.5 18.5 10 18.5 10 15.1 15.5 10 15.5 1.5 10 1.5 10Z" />
      <circle cx="10" cy="10" r="2.75" />
      {off ? <path d="M3.5 3.5 16.5 16.5" /> : null}
    </svg>
  );
}

export default function PasswordField({
  label = 'Password',
  action,
  error,
  hint,
  id,
  className,
  required,
  disabled,
  ...props
}) {
  const auto = useId();
  const fieldId = id || auto;
  const [visible, setVisible] = useState(false);

  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      action={action}
    >
      {(field) => (
        <div
          className="flex w-full rounded-ds-slot has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-0 has-[input:focus-visible]:outline-ds-cobalt"
          style={{ padding: 'var(--ds-focus-gap)' }}
        >
          <div className="relative flex w-full">
            <input
              {...field}
              {...props}
              type={visible ? 'text' : 'password'}
              required={required}
              disabled={disabled}
              className={cn(
                CONTROL_FACE,
                'pr-11',
                error && 'border-ds-error hover:border-ds-error',
                className
              )}
              style={{ height: 'var(--ds-control-h)' }}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Hide password' : 'Show password'}
              aria-pressed={visible}
              aria-controls={fieldId}
              disabled={disabled}
              className={cn(
                'absolute right-0 top-0 grid aspect-square cursor-pointer place-items-center',
                'rounded-ds-inner text-ds-ink-muted hover:text-ds-ink',
                'transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ds-cobalt',
                'disabled:pointer-events-none disabled:text-ds-ink-muted'
              )}
              style={{ height: 'var(--ds-control-h)' }}
            >
              <EyeIcon off={visible} />
            </button>
          </div>
        </div>
      )}
    </Field>
  );
}
