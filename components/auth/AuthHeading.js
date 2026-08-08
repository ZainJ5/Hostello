import { cn } from '@/lib/utils';

/** Page title block shared by every auth screen, so they line up exactly. */
export default function AuthHeading({ eyebrow, icon: Icon, title, description, className }) {
  return (
    <div className={cn('mb-7', className)}>
      {(eyebrow || Icon) && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {Icon && <Icon className="size-3.5 text-brand-700 dark:text-brand-300" aria-hidden="true" />}
          {eyebrow}
        </p>
      )}
      <h1 className="text-h2 text-balance text-foreground">{title}</h1>
      {description && (
        <p className="mt-2.5 text-sm leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
