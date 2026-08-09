import { cn } from '@/lib/utils';

/**
 * Shared feedback surfaces for the student site. Elevation is a hairline
 * border in light mode and a value step in dark, never a shadow: cards do not
 * lift. Shadow is reserved for sheets, menus and toasts.
 */

export function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton rounded-ds-inner bg-ds-surface-sunken', className)}
    />
  );
}

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-ds-control border-t-transparent motion-reduce:animate-none',
        className
      )}
    />
  );
}

export function EmptyState({ title, body, action, className }) {
  return (
    <div
      className={cn(
        'ds-elevated flex flex-col items-start gap-3 rounded-ds-inner p-6',
        className
      )}
    >
      <p className="ds-display-s text-ds-ink">{title}</p>
      {body ? <p className="ds-body-m max-w-[60ch] text-ds-ink-muted">{body}</p> : null}
      {action}
    </div>
  );
}

/**
 * Tone never carries meaning on its own. Error uses the error token for its
 * keyline and its text, and states the problem in words as well.
 */
export function Alert({ tone = 'info', title, children, className }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col gap-1 rounded-ds-inner border border-solid p-4',
        tone === 'error'
          ? 'border-ds-error bg-ds-surface-raised'
          : 'border-ds-hairline bg-ds-surface-sunken',
        className
      )}
    >
      {title ? (
        <p className={cn('ds-body-m-strong', tone === 'error' ? 'text-ds-error' : 'text-ds-ink')}>
          {title}
        </p>
      ) : null}
      {children ? <div className="ds-body-m text-ds-ink-muted">{children}</div> : null}
    </div>
  );
}
