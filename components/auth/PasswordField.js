'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { cn } from '@/lib/utils';

/*
 * The UI kit's <Input> owns its whole row, so it can't make room for a toggle
 * button. These two strings are copied verbatim from the CONTROL / INVALID
 * constants in components/ui/Field.js (which doesn't export them) so a password
 * box is pixel-identical to every other input on the page.
 */
const CONTROL =
  'w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/70 transition-colors duration-200 ' +
  'hover:border-border-strong focus:border-brand-600 focus:outline-none ' +
  'focus:ring-4 focus:ring-brand-600/12 disabled:opacity-60 disabled:cursor-not-allowed';

const INVALID = 'border-danger focus:border-danger focus:ring-danger/12';

/**
 * Password input with a show/hide toggle.
 *
 * The toggle is a 44×44 button inside the field, labelled for its *action*
 * ("Show password" / "Hide password") and given aria-pressed so a screen
 * reader announces the current state rather than just the icon.
 */
export default function PasswordField({
  label = 'Password',
  action,
  error,
  hint,
  id,
  className,
  required,
  ...props
}) {
  const auto = useId();
  const fieldId = id || auto;
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="block text-sm font-medium text-foreground">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {action}
      </div>

      <Field error={error} hint={hint}>
        <div className="relative">
          <input
            id={fieldId}
            type={visible ? 'text' : 'password'}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            className={cn(CONTROL, 'h-11 pr-12', error && INVALID, className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            aria-controls={fieldId}
            tabIndex={props.disabled ? -1 : 0}
            disabled={props.disabled}
            className={cn(
              'absolute top-0 right-0 grid size-11 cursor-pointer place-items-center rounded-xl',
              'text-muted-foreground transition-colors duration-200',
              'hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2',
              'focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60'
            )}
          >
            {visible ? (
              <EyeOff className="size-[1.125rem]" aria-hidden="true" />
            ) : (
              <Eye className="size-[1.125rem]" aria-hidden="true" />
            )}
          </button>
        </div>
      </Field>
    </div>
  );
}
