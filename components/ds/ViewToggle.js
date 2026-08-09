import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Figma input/view-toggle 74:153.
 *
 * Selected is a solid ink fill, the same grammar as chips, badges and the bed
 * strip. Both segments stay 44 tall.
 *
 * List is a genuine alternative rather than a narrower grid: it drops the
 * photo to a thumbnail and gains the facilities line, which is what a student
 * comparing eight hostels on rent actually wants. The design also has it gain
 * the room types, which no listing records, so that part is absent.
 *
 * Two links rather than a client toggle, so the view is in the URL and a
 * result set stays shareable.
 */
export default function ViewToggle({ view = 'grid', hrefFor, className }) {
  const segment = (key, label) => {
    const active = view === key;
    return (
      <Link
        href={hrefFor(key)}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'ds-body-s inline-flex items-center justify-center px-3.5 focus:outline-none',
          'transition-colors duration-150 motion-reduce:transition-none',
          active ? 'bg-ds-ink text-ds-on-ink' : 'bg-ds-surface text-ds-ink'
        )}
        style={{ height: 'var(--ds-control-h)' }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div
      className={cn(
        'inline-flex rounded-ds-slot',
        'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-ds-cobalt',
        className
      )}
      style={{ padding: 'var(--ds-focus-gap)' }}
    >
      <div
        role="group"
        aria-label="Result layout"
        className="inline-flex overflow-hidden rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised hover:border-ds-cobalt"
      >
        {segment('grid', 'Grid')}
        {segment('list', 'List')}
      </div>
    </div>
  );
}
