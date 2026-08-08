import { cn } from '@/lib/utils';

export default function Card({ as: Tag = 'div', className, interactive, children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface',
        interactive &&
          'transition-[transform,box-shadow,border-color] duration-300 ' +
            'hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 p-5 pb-0', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

/** Dashboard stat tile. `delta` is a signed percentage vs the prior period. */
export function StatCard({ label, value, delta, icon: Icon, hint, className }) {
  const up = Number(delta) > 0;
  const down = Number(delta) < 0;
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="tabular mt-3 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      {(delta !== undefined && delta !== null) || hint ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {delta !== undefined && delta !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular',
                up && 'bg-success-soft text-success dark:bg-success/15 dark:text-emerald-300',
                down && 'bg-danger-soft text-danger dark:bg-danger/15 dark:text-red-300',
                !up && !down && 'bg-muted text-muted-foreground'
              )}
            >
              {/* Arrow plus sign — never colour alone to convey direction. */}
              <span aria-hidden="true">{up ? '↑' : down ? '↓' : '→'}</span>
              {up ? '+' : ''}
              {delta}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      ) : null}
    </Card>
  );
}
