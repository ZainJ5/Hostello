import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * City tile from section/by-city 89:2565: a hairline box carrying the name and
 * the count, nothing else.
 *
 * NO PHOTOGRAPH. The live site put a listing photo behind each city, which
 * meant the tile for Karachi was one owner's bedroom standing in for a city of
 * twenty million, and the two listings actually in it were invisible behind
 * the picture. The count is the honest thing on this tile and it is what a
 * student needs: Lahore says 3, and that tells them where they are.
 *
 * `photo` is accepted and ignored so the home page query does not have to
 * change shape.
 */
export default function CityCard({ city, count = 0, className }) {
  return (
    <Link
      href={`/hostels?city=${encodeURIComponent(city)}`}
      className={cn(
        'ds-elevated flex w-full flex-col justify-center gap-1 rounded-ds-inner px-3.5 py-3',
        'transition-colors duration-150 motion-reduce:transition-none hover:border-ds-cobalt',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt',
        className
      )}
    >
      <span className="ds-body-m-strong truncate text-ds-ink">{city}</span>
      <span className="ds-mono-meta text-ds-ink-muted">
        {count} {count === 1 ? 'hostel' : 'hostels'}
      </span>
    </Link>
  );
}
