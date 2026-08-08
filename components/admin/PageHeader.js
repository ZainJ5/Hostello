import { cn } from '@/lib/utils';

/**
 * Every admin screen opens the same way: eyebrow, title, one-line purpose,
 * actions on the right. Denser than the public site by design.
 */
export default function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-0.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Section divider inside a dense page — a label with a hairline rule. */
export function SectionTitle({ title, description, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
