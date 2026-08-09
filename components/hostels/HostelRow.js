import Image from 'next/image';
import Link from 'next/link';
import Badge from '@/components/ds/Badge';
import Chip from '@/components/ds/Chip';
import { cn, formatPKR } from '@/lib/utils';
import { distanceBand, formatKm } from '@/lib/distance';

/**
 * The list row behind input/view-toggle 74:153.
 *
 * List is a genuine alternative to the grid rather than a narrower version of
 * it: the photo drops to a thumbnail and the row gains the full facilities
 * line, which is what a student comparing eight hostels on rent and on what is
 * included actually wants to read down a column.
 *
 * The design also has the row gain the room types. No listing records one, so
 * that part is absent rather than invented, exactly as on the card.
 */
export default function HostelRow({ hostel, campus, priority = false, className }) {
  const photo = Array.isArray(hostel.images) && hostel.images.length ? hostel.images[0] : null;
  const facilities = (Array.isArray(hostel.facilities) ? hostel.facilities : []).filter(Boolean);

  const km = campus ? formatKm(campus.km) : null;
  const band = campus ? distanceBand(campus.km) : null;

  const min = Number(hostel.priceMin) || 0;
  const max = Number(hostel.priceMax) || 0;
  const base = Number(hostel.price) || 0;
  const rent =
    min && max && max > min
      ? `${formatPKR(min)} to ${formatPKR(max)}`
      : min || base
        ? formatPKR(min || base)
        : null;

  const who =
    hostel.gender === 'Female'
      ? 'Female only'
      : hostel.gender === 'Male'
        ? 'Male only'
        : 'Mixed';

  return (
    <article
      className={cn(
        'ds-elevated relative flex w-full gap-4 overflow-hidden rounded-ds-inner p-4',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ds-cobalt',
        className
      )}
    >
      <div className="relative aspect-4/3 w-28 shrink-0 overflow-hidden rounded-ds-chip bg-ds-photo sm:w-40">
        {photo ? (
          <Image
            src={photo}
            alt={hostel.name}
            fill
            priority={priority}
            sizes="(min-width: 640px) 10rem, 7rem"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex min-w-px flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h3 className="ds-display-s min-w-px text-ds-ink">
            <Link
              href={`/hostels/${hostel.slug}`}
              className="focus:outline-none after:absolute after:inset-0 after:content-['']"
            >
              {hostel.name}
            </Link>
          </h3>
          <Badge variant={hostel.verified ? 'solid' : 'outline'}>
            {hostel.verified ? 'Verified' : 'Not verified'}
          </Badge>
        </div>

        {km ? (
          <p className="ds-body-s text-ds-ink-muted">
            {km} to {campus.label}
            {band ? `, ${band}` : ''}
          </p>
        ) : null}

        {rent ? (
          <p className="ds-figure-l text-ds-ink">
            {rent}
            <span className="ds-body-s ml-2 text-ds-ink-muted">per month</span>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          <Chip>{who}</Chip>
          {facilities.map((f) => (
            <Chip key={f}>{f}</Chip>
          ))}
        </div>
      </div>
    </article>
  );
}
