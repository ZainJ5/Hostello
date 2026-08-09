import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Follows the button spec in DESIGN.md: flat fills, 8px radius,
 * 48px default height, weight 500. Buttons carry no shadow; depth in this
 * system comes from photography and rounded clipping, not elevation.
 *
 * Variants map to intent, not colour, so pages never hand-pick a shade:
 *   primary   Rausch. The one action a screen wants.
 *   accent    Ink fill. A second high-emphasis action that must not
 *             compete with Rausch (publish, submit for review).
 *   secondary White with an ink hairline outline.
 *   outline   White with a Rausch outline.
 *   ghost     Text only; underlines on hover.
 *   danger    Destructive, always paired with a confirmation.
 */
const VARIANTS = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
  accent:
    'bg-foreground text-background hover:opacity-90 active:opacity-80 font-medium',
  secondary:
    'bg-surface text-foreground border border-foreground hover:bg-muted active:bg-accent-200 dark:border-border-strong',
  outline:
    'bg-surface text-brand-700 border border-brand-500 hover:bg-brand-50 active:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-950',
  ghost:
    'text-foreground hover:bg-muted hover:underline underline-offset-4 active:bg-accent-200 dark:active:bg-surface-raised',
  danger: 'bg-danger text-white hover:brightness-110 active:brightness-95',
};

// Heights follow the spec's 48px primary CTA. `sm` is reserved for dense
// dashboard toolbars where a pointer is assumed.
const SIZES = {
  sm: 'h-10 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-12 px-6 text-base gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
  xl: 'h-14 px-8 text-base gap-2.5 rounded-lg',
  icon: 'h-12 w-12 rounded-full',
  pill: 'h-10 px-5 text-sm gap-2 rounded-full',
};

const BASE =
  'inline-flex items-center justify-center font-medium cursor-pointer select-none ' +
  'transition-[background-color,color,opacity,border-color] duration-200 ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring whitespace-nowrap';

export default function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled,
  children,
  ...props
}) {
  const classes = cn(BASE, VARIANTS[variant] || VARIANTS.primary, SIZES[size], className);
  const content = (
    <>
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-busy={loading || undefined} {...props}>
        {content}
      </Link>
    );
  }

  const Tag = as || 'button';
  return (
    <Tag
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Tag>
  );
}
