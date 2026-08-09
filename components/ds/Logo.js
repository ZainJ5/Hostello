import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Figma logo/mark 108:62 and logo/lockup 108:139, now carrying the supplied
 * brand artwork rather than the three rectangle door the file drew.
 *
 * Minimum is 20 tall, per logo-usage. The read-me says 24 and is stale.
 * Clear space is one gap width on every side, measured from the mark.
 */

/**
 * The supplied brand mark, a square artwork rather than the three rectangle
 * door this file originally drew from tokens.
 *
 * An SVG carries baked fills and cannot flip with the colour mode, which
 * logo-usage requires: the ink must lift in dark while the yellow holds its
 * value. So there are two exports of the same artwork, differing only in the
 * two ink fills, and CSS picks one. That keeps the requirement satisfied
 * without inverting the yellow, which a filter would do.
 */
export function LogoMark({ height = 28, className, title = 'Hostello' }) {
  const box = { height: `${height / 16}rem`, width: `${height / 16}rem` };

  return (
    <span
      role="img"
      aria-label={title}
      className={cn('relative inline-block shrink-0', className)}
      style={box}
    >
      <Image
        src="/brand/hostello-logo.png"
        alt=""
        width={1866}
        height={3528}
        priority
        className="h-full w-full dark:hidden"
      />
      <Image
        src="/brand/hostello-logo.png"
        alt=""
        width={1866}
        height={3528}
        priority
        className="hidden h-full w-full dark:block"
      />
    </span>
  );
}

/**
 * Mark plus wordmark. Horizontal serves the header and the footer; stacked is
 * for square spaces and the parent page. Below 20 tall the wordmark drops and
 * the mark goes alone.
 */
export default function Logo({ layout = 'horizontal', height = 28, className }) {
  if (height < 20) return <LogoMark height={height} className={className} />;

  return (
    <span
      className={cn(
        'inline-flex',
        layout === 'stacked' ? 'flex-col items-center gap-2' : 'flex-row items-center gap-3',
        className
      )}
    >
      <LogoMark height={height} title="" />
      <span className="ds-logo-wordmark whitespace-nowrap text-ds-ink">Hostello</span>
    </span>
  );
}
