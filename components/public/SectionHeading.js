import { cn } from '@/lib/utils';

/**
 * One heading treatment for every home-page section, so the eyebrow → title →
 * description rhythm never drifts between blocks.
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'start',
  className,
}) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'flex flex-col gap-5',
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between sm:gap-8',
        className
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto')}>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-3 text-h2 text-balance text-foreground">{title}</h2>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
