import { avatarInitials } from './identity';
import { cn } from '@/lib/utils';

/**
 * Initials in a circle. There is no uploaded photograph anywhere in the
 * community routes and there deliberately is not: a face beside a room number
 * and a walking route is the one piece of data on these pages that could not
 * be taken back once it is out.
 *
 * The circle is the only round shape in the system, which is what makes a
 * person legible in a list of rectangles.
 */
export default function Avatar({ name, size = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-solid border-ds-hairline bg-ds-surface-sunken text-ds-ink',
        size === 'lg' ? 'size-12 ds-body-m-strong' : 'size-10 ds-body-s-strong',
        className
      )}
    >
      {avatarInitials(name)}
    </span>
  );
}
