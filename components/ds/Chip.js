import { cn } from '@/lib/utils';

/**
 * The small fact chip used on a listing card, from card/hostel/search 18:13.
 * Sunken fill, ink text, no border. It is not a control and is never yellow.
 *
 * For the interactive filter chip see FilterChip, which is a different
 * component with its own states.
 */
export default function Chip({ children, className }) {
  return (
    <span
      className={cn(
        'ds-body-s-strong inline-flex items-center rounded-ds-chip bg-ds-surface-sunken px-2 py-1 text-ds-ink',
        className
      )}
    >
      {children}
    </span>
  );
}
