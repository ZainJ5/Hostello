import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Figma campus-tiles inside section/by-campus 89:2525: a six across grid of
 * hairline tiles, each carrying a campus and how many hostels reference it.
 *
 * A GRID, NOT A RAIL. The live site scrolled these sideways, which hid two
 * thirds of the campuses behind a gesture on the one device where a horizontal
 * scroller is easiest to miss. Eighteen tiles fit in three rows at 1440 and
 * two columns at 390, so nothing needs hiding.
 *
 * The count is the point of the tile. NUST reads 34 and QAU reads 18, and a
 * student starting at QAU learns something true before they click.
 */
export default function UniversityRail({ universities = [], className }) {
  if (!universities.length) return null;

  return (
    <ul className={cn('grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6', className)}>
      {universities.map((university) => (
        <li key={university.name}>
          <Link
            href={`/hostels?university=${encodeURIComponent(university.name)}`}
            className={cn(
              'ds-elevated flex w-full flex-col justify-center gap-1 rounded-ds-inner px-3.5 py-3',
              'transition-colors duration-150 motion-reduce:transition-none hover:border-ds-cobalt',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
            )}
          >
            <span className="ds-body-m-strong truncate text-ds-ink">{university.name}</span>
            <span className="ds-mono-meta text-ds-ink-muted">
              {university.count} {university.count === 1 ? 'hostel' : 'hostels'}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
