import { cn } from '@/lib/utils';

/**
 * Form controls for the community forms.
 *
 * `components/ds` has no text input, and adding one is a central decision this
 * work does not get to make on its own, so these are built here from the same
 * tokens and the same shared focus pattern the ds controls use: a transparent
 * slot carries the focus ring at radius 7 with a 3px gap, so nothing reflows
 * between states, and the control inside is radius 4 at the 44px control
 * height. If these are ever promoted into the ds set they should replace, not
 * fork, what is here.
 */

const SLOT =
  'flex w-full rounded-ds-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt';

const FACE =
  'ds-body-m w-full min-w-px rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised px-3 text-ds-ink placeholder:text-ds-ink-muted hover:border-ds-cobalt focus:border-ds-ink focus:outline-none disabled:cursor-not-allowed disabled:border-ds-hairline disabled:bg-ds-surface-sunken disabled:text-ds-ink-muted';

const PAD = { padding: 'var(--ds-focus-gap)' };
const LINE = { height: 'var(--ds-control-h)' };

export function Field({ id, label, hint, error, required, children, className }) {
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <label htmlFor={id} className="ds-label text-ds-ink">
        {label}
        {required ? null : (
          <span className="ds-body-s ml-2 normal-case text-ds-ink-muted">optional</span>
        )}
      </label>
      {children}
      {hint && !error ? <p className="ds-body-s text-ds-ink-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="ds-body-s text-ds-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({ id, suffix, className, ...props }) {
  return (
    <span className={cn(SLOT, className)} style={PAD}>
      <span
        className="flex min-w-px flex-1 items-center gap-2 rounded-ds-inner"
        style={LINE}
      >
        <input id={id} className={cn(FACE, 'h-full')} {...props} />
        {suffix ? (
          <span className="ds-mono-meta shrink-0 pr-1 text-ds-ink-muted">{suffix}</span>
        ) : null}
      </span>
    </span>
  );
}

export function TextArea({ id, rows = 4, className, ...props }) {
  return (
    <span className={cn(SLOT, className)} style={PAD}>
      <textarea id={id} rows={rows} className={cn(FACE, 'resize-y py-2.5')} {...props} />
    </span>
  );
}

export function Select({ id, options, className, ...props }) {
  return (
    <span className={cn(SLOT, className)} style={PAD}>
      <span className="relative flex min-w-px flex-1 items-center" style={LINE}>
        <select id={id} className={cn(FACE, 'h-full cursor-pointer appearance-none pr-9')} {...props}>
          {options.map((o) =>
            typeof o === 'string' ? (
              <option key={o} value={o}>
                {o}
              </option>
            ) : (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            )
          )}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 7"
          className="pointer-events-none absolute right-3 size-3 text-ds-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M1 1l5 5 5-5" />
        </svg>
      </span>
    </span>
  );
}

/**
 * A checkbox is 20px, which is nowhere near a target, so the whole row is the
 * control and the row clears 44.
 */
export function CheckRow({ id, label, className, ...props }) {
  return (
    <span
      className={cn(
        'flex rounded-ds-slot focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt',
        className
      )}
      style={PAD}
    >
      <label
        htmlFor={id}
        className="ds-body-m ds-tap flex w-full cursor-pointer items-center gap-3 rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised px-3 text-ds-ink hover:border-ds-cobalt"
      >
        <input
          id={id}
          type="checkbox"
          className="size-5 shrink-0 accent-ds-ink focus:outline-none"
          {...props}
        />
        <span>{label}</span>
      </label>
    </span>
  );
}

export function CheckGroup({ legend, hint, error, children }) {
  return (
    <fieldset className="flex w-full flex-col gap-1.5">
      <legend className="ds-label text-ds-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint && !error ? <p className="ds-body-s text-ds-ink-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="ds-body-s text-ds-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
