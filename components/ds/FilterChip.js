import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Figma chip/filter 27:50.
 *
 * Selected is a solid ink fill with inverse text, the same solid versus
 * hollow grammar as the status badge and the bed strip.
 *
 * The chip itself is 38 tall. The transparent slot around it carries the
 * focus ring and takes the target to 44, so the chip never changes size
 * between states and the row never reflows on focus.
 *
 * Renders as a link when given href, so filters stay crawlable and
 * shareable, and as a button otherwise.
 */
export default function FilterChip({
  children,
  href,
  selected = false,
  disabled = false,
  count,
  className,
  ...props
}) {
  const slot = cn(
    'inline-flex rounded-ds-chip-slot',
    'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt',
    className
  );

  const face = cn(
    'ds-body-s-strong inline-flex cursor-pointer items-center justify-center gap-1.5',
    'rounded-ds-chip border border-solid px-3',
    'transition-colors duration-150 motion-reduce:transition-none',
    'focus:outline-none',
    disabled
      ? 'bg-ds-surface-sunken border-ds-control text-ds-ink-muted cursor-not-allowed'
      : selected
        ? 'bg-ds-ink border-ds-ink text-ds-on-ink'
        : 'bg-ds-surface-raised border-ds-control text-ds-ink hover:border-ds-cobalt'
  );

  const body = (
    <>
      <span>{children}</span>
      {typeof count === 'number' ? (
        <span className={cn('ds-mono-meta', selected ? 'text-ds-on-ink' : 'text-ds-ink-muted')}>
          {count}
        </span>
      ) : null}
    </>
  );

  const style = { height: 'var(--ds-chip-h)' };
  const pad = { padding: 'var(--ds-focus-gap)' };

  if (href && !disabled) {
    return (
      <span className={slot} style={pad}>
        <Link href={href} className={face} style={style} aria-pressed={selected} {...props}>
          {body}
        </Link>
      </span>
    );
  }

  return (
    <span className={slot} style={pad}>
      <button type="button" className={face} style={style} disabled={disabled} aria-pressed={selected} {...props}>
        {body}
      </button>
    </span>
  );
}
