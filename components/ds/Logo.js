import { cn } from '@/lib/utils';

/**
 * Figma logo/mark 108:62 and logo/lockup 108:139.
 *
 * A door left open: a thin ink frame, a solid ink panel pushed right, and a
 * chrome yellow gap down the left.
 *
 * DRAWN FROM TOKENS, NOT IMPORTED AS AN SVG, and deliberately so. The file
 * requires that in dark mode the frame and panel flip to the light ink value
 * because they are bound to color/ink, while the yellow gap holds its value.
 * An exported SVG carries baked in fills and cannot do that. The mark is three
 * rectangles in Figma, so this is a faithful reproduction rather than a
 * redrawing, and it stays one component: a change to the shape is one edit.
 *
 * Geometry is proportional to the mark height, so the same component serves
 * the header at 28 and any other size without a second asset. Minimum is 20
 * tall, per logo-usage. The read-me says 24 and is stale.
 *
 * Clear space is one gap width on every side, measured from the mark.
 */

const RATIO = {
  // The mark is 17 wide by 28 tall. Everything else is a fraction of that.
  aspect: 17 / 28,
  inset: 2 / 28,
  gapLeft: 2 / 17,
  gapWidth: 4 / 17,
  panelLeft: 6 / 17,
  panelWidth: 9 / 17,
};

export function LogoMark({ height = 28, className, title = 'Hostello' }) {
  const h = `${height / 16}rem`;
  const w = `${(height * RATIO.aspect) / 16}rem`;

  return (
    <span
      role="img"
      aria-label={title}
      className={cn('relative inline-block shrink-0', className)}
      style={{ height: h, width: w }}
    >
      {/* frame */}
      <span
        aria-hidden="true"
        className="absolute inset-0 border border-solid border-ds-ink"
      />
      {/* open gap, the one place the yellow holds its value in both modes */}
      <span
        aria-hidden="true"
        className="absolute bg-ds-primary"
        style={{
          left: `${RATIO.gapLeft * 100}%`,
          width: `${RATIO.gapWidth * 100}%`,
          top: `${RATIO.inset * 100}%`,
          bottom: `${RATIO.inset * 100}%`,
        }}
      />
      {/* panel */}
      <span
        aria-hidden="true"
        className="absolute bg-ds-ink"
        style={{
          left: `${RATIO.panelLeft * 100}%`,
          width: `${RATIO.panelWidth * 100}%`,
          top: `${RATIO.inset * 100}%`,
          bottom: `${RATIO.inset * 100}%`,
        }}
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
