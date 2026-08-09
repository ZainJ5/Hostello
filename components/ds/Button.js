'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Figma button/primary 17:21 and button/secondary 27:31.
 *
 * THE 1PX INK KEYLINE IS LOAD BEARING. Chrome yellow measures 1.90:1 against
 * white, so the button shape on its own fails WCAG 1.4.11 for a control
 * boundary. The keyline is the only thing making that boundary perceivable,
 * and it never comes off for a cleaner look.
 *
 * The yellow fill holds the same value across every state. Darkening drifts
 * toward olive, which sits inside the band that dominates real listing
 * photography; lightening drops the boundary against white below 1.4:1.
 *
 * Hover shifts the keyline colour from ink to cobalt and holds it at 1px. A
 * hue shift is more perceptible at 1px than a weight change and costs no
 * geometry, so nothing reflows. Cobalt already means interaction here, so
 * hover and focus speak the same colour.
 *
 * Labels do not change between states. Loading shows a spinner beside the
 * same label; only a result screen changes the wording.
 */

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-[1.125rem] shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

export default function Button({
  children,
  href,
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  className,
  ...props
}) {
  const isDisabled = disabled || loading;

  const shell = cn(
    // The 4px shell is what the focus ring is drawn on, so focus never
    // changes the size of the control itself.
    'inline-flex rounded-ds-control p-1',
    'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt',
    className
  );

  const face = cn(
    'ds-body-m-strong ds-tap inline-flex w-full items-center justify-center gap-2.5',
    'rounded-ds-inner border border-solid px-5',
    'transition-colors duration-150 motion-reduce:transition-none',
    'focus:outline-none',
    variant === 'primary' && [
      'bg-ds-primary text-ds-on-primary border-ds-ink',
      !isDisabled && 'hover:border-ds-cobalt',
      // Pressed inverts to ink with a yellow label, 9.8:1 in both directions.
      !isDisabled && 'active:bg-ds-ink active:text-ds-primary active:border-ds-ink',
    ],
    variant === 'secondary' && [
      'bg-ds-surface-raised text-ds-ink border-ds-ink',
      !isDisabled && 'hover:border-ds-cobalt hover:text-ds-cobalt',
      !isDisabled && 'active:bg-ds-ink active:text-ds-on-ink',
    ],
    // Disabled leaves yellow entirely and uses muted ink on sunken at 6.4:1,
    // so a disabled control still says what it does.
    isDisabled && 'bg-ds-surface-sunken text-ds-ink-muted border-ds-control cursor-not-allowed'
  );

  const body = (
    <>
      {loading && <Spinner />}
      <span>{children}</span>
    </>
  );

  if (href && !isDisabled) {
    return (
      <span className={shell}>
        <Link href={href} className={face} {...props}>
          {body}
        </Link>
      </span>
    );
  }

  return (
    <span className={shell}>
      <button
        type={type}
        className={face}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {body}
      </button>
    </span>
  );
}
