import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DISTANCE_NOTE, distanceBand, formatKm } from '@/lib/distance';
import { campusRows } from './campus-distance';

/**
 * Figma listing/campus-distance 75:59. One row per campus, underlined with a
 * hairline: the short tag, the institution's full name, the distance in mono
 * so a column of figures compares digit under digit, and the band.
 *
 * KILOMETRES AND A BAND, NOT MINUTES. An earlier draft of the card read
 * "31 min walk to FJWU". The design file corrects itself on exactly this
 * point: a walk time was a nicer decision input and an invented one. Hostello
 * has no routing and no isochrones, so it measures a straight line and says
 * so underneath.
 *
 * Every row is a link into the browse page filtered to that campus, so the
 * table doubles as the way to see what else is near the same university.
 */
export default function CampusDistance({ hostel, className }) {
  const rows = campusRows(hostel);
  const maps =
    Number.isFinite(hostel.lat) && Number.isFinite(hostel.lng) && (hostel.lat || hostel.lng)
      ? `https://www.google.com/maps/search/?api=1&query=${hostel.lat},${hostel.lng}`
      : null;

  if (!rows.length) {
    return (
      <div className={cn('flex w-full flex-col gap-3', className)}>
        <p className="ds-body-m text-ds-ink-muted">
          This listing has no campus recorded near it, so there is no distance to measure.
        </p>
        {maps ? <MapsLink href={maps} /> : null}
      </div>
    );
  }

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <ul className="flex w-full flex-col">
        {rows.map(({ campus, km, full, tagged }) => (
          <li key={campus.name} className="border-b border-solid border-ds-hairline">
            <Link
              href={`/hostels?university=${encodeURIComponent(campus.name)}`}
              className={cn(
                'flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-ds-inner px-1 py-2',
                'transition-colors duration-150 motion-reduce:transition-none hover:bg-ds-surface-sunken',
                'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ds-cobalt'
              )}
              style={{ minHeight: 'var(--ds-control-h)' }}
            >
              <span
                className={cn(
                  'ds-body-s-strong inline-flex shrink-0 items-center rounded-ds-chip border border-solid px-2 py-1',
                  tagged
                    ? 'border-ds-ink bg-ds-surface-raised text-ds-ink'
                    : 'border-ds-hairline bg-ds-surface-raised text-ds-ink-muted'
                )}
              >
                {campus.name}
              </span>

              <span className="ds-body-m min-w-px flex-1 text-ds-ink-muted">{full}</span>

              <span className="ds-mono-table shrink-0 text-ds-ink">{formatKm(km)}</span>
              <span className="ds-body-s w-28 shrink-0 text-ds-ink-muted">{distanceBand(km)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="ds-body-s max-w-[80ch] text-ds-ink-muted">{DISTANCE_NOTE}</p>
      {maps ? <MapsLink href={maps} /> : null}
    </div>
  );
}

/**
 * Kept from the live site. The design drops it, but a straight line figure is
 * not directions, and this is how a student actually finds the door.
 */
function MapsLink({ href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ds-body-s-strong inline-flex w-fit items-center rounded-ds-inner text-ds-cobalt underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
    >
      Open this address in Google Maps
    </a>
  );
}
