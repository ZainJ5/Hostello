import { cn } from '@/lib/utils';

/**
 * Figma badge/status 16:32.
 *
 * Both states are ink. Solid with inverse text means verified. Outline means
 * not verified, expired, closed or full. Same solid versus hollow grammar as
 * the bed strip, so the badge inherits the signature rather than needing a
 * new rule.
 *
 * Outline carries a surface fill rather than a transparent one. On a listing
 * photo a transparent fill would put ink text straight onto the photo at
 * about 3.2:1 and fail AA; the surface fill gives 18.5:1 text and still keeps
 * a perceivable boundary.
 *
 * Status badges never use the error or success colours: against the mean tone
 * of real listing photography those measure 1.34:1 and 1.13:1.
 */
export default function Badge({ children, variant = 'solid', className }) {
  return (
    <span
      className={cn(
        'ds-body-s-strong inline-flex items-center rounded-ds-chip px-2.5 py-1.5',
        variant === 'solid'
          ? 'bg-ds-ink text-ds-on-ink'
          : 'border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
        className
      )}
    >
      {children}
    </span>
  );
}
