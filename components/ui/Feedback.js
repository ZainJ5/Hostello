import { cn } from '@/lib/utils';

/** Loading placeholder. Always give it the size of the content it replaces. */
export function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden="true" />;
}

export function Spinner({ className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent',
        className
      )}
    />
  );
}

/**
 * Shown when a list has no rows. Always offers the action that would create
 * the first one — an empty screen with no exit is a dead end.
 */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-panel)] border border-dashed border-border-strong bg-surface-sunken px-6 py-14 text-center',
        className
      )}
    >
      {Icon && (
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Star rating. Renders the numeric value alongside so colour isn't the only cue. */
export function Rating({ value = 0, count, size = 'md', showValue = true, className }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const px = { sm: 'size-3.5', md: 'size-4', lg: 'size-5' }[size] || 'size-4';
  const text = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size] || 'text-sm';

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label={`Rated ${v.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ''}`}
    >
      {/* Stars render in ink, not gold — a deliberate choice carried over
          from the source system, where yellow stars read as cheap in a
          travel context. */}
      <span className="inline-flex" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          // Fraction of this star that should be filled, 0–1.
          const fill = Math.max(0, Math.min(1, v - i));
          return (
            <span key={i} className={cn('relative', px)}>
              <Star className={cn(px, 'text-border-strong')} />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star className={cn(px, 'text-foreground')} filled />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showValue && (
        <span className={cn('tabular font-semibold text-foreground', text)}>
          {v.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className={cn('tabular text-muted-foreground', text)}>
          ({count})
        </span>
      )}
    </span>
  );
}

function Star({ className, filled }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path
        d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z"
        opacity={filled ? 1 : 0.35}
      />
    </svg>
  );
}

export function Avatar({ name, src, size = 'md', className }) {
  const dim = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base' }[size];
  const letters = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || 'User'}
        className={cn('rounded-full object-cover', dim, className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-200',
        dim,
        className
      )}
    >
      {letters}
    </span>
  );
}

/** Inline page-level message. `tone` maps to the shared status palette. */
export function Alert({ tone = 'info', title, children, className }) {
  const tones = {
    info: 'bg-info-soft/60 border-info/25 text-info dark:bg-info/10 dark:text-sky-300',
    success:
      'bg-success-soft/60 border-success/25 text-success dark:bg-success/10 dark:text-emerald-300',
    warning:
      'bg-warning-soft/60 border-warning/25 text-warning dark:bg-warning/10 dark:text-amber-300',
    danger:
      'bg-danger-soft/60 border-danger/25 text-danger dark:bg-danger/10 dark:text-red-300',
  };
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && 'mt-0.5', 'text-pretty')}>{children}</div>}
    </div>
  );
}
