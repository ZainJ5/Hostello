import { cn } from '@/lib/utils';

/**
 * The 44 initials disc from card/match 39:32.
 *
 * Initials, never a photograph. Two students who have not been introduced
 * should not be able to see each other's face, and a roommate profile has no
 * photo field for exactly that reason.
 *
 * Sunken fill with a hairline, so it reads as a slot rather than a control and
 * cannot be mistaken for something to press.
 */
export default function Avatar({ initials, size = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'border border-solid border-ds-hairline bg-ds-surface-sunken text-ds-ink',
        size === 'lg' ? 'ds-body-m-strong size-14' : 'ds-body-s-strong size-11',
        className
      )}
    >
      {initials || '?'}
    </span>
  );
}
