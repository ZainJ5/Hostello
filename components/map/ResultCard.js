'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Badge from '@/components/ds/Badge';
import Chip from '@/components/ds/Chip';
import { cn, formatPKR } from '@/lib/utils';
import { distanceBand, formatKm } from '@/lib/distance';

/**
 * Compact horizontal card: photo left, details right. The column is about 40%
 * of the viewport, far too narrow for the grid card the browse and landing
 * pages use, so this is the one place a second card shape is justified.
 *
 * Two interactive targets, deliberately not nested: a full-bleed button that
 * pans the map, and the name as a real link to the listing. Keyboard order is
 * button then link, and both carry their own focus ring.
 *
 * Selection is a solid ink keyline rather than a tint, which is the same
 * grammar the markers, the chips and the badges use.
 */
function ResultCard({
  hostel,
  active,
  selected,
  showDistance,
  campusName,
  idPrefix,
  onSelect,
  onHover,
}) {
  const price = Number(hostel.price) || 0;
  const km = Number(hostel.campusDistanceKm);
  const distance = showDistance && Number.isFinite(km) ? formatKm(km) : null;
  const band = distance ? distanceBand(km) : null;
  const photo = hostel.images?.[0] || '';

  return (
    <li
      id={`${idPrefix}-${hostel._id}`}
      onMouseEnter={() => onHover(hostel._id)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        data-active={active || undefined}
        data-selected={selected || undefined}
        className={cn(
          'ds-elevated group relative flex gap-3 rounded-ds-inner p-3',
          'transition-colors duration-150 motion-reduce:transition-none',
          'hover:border-ds-cobalt',
          'data-active:border-ds-cobalt',
          'data-selected:border-ds-ink data-selected:bg-ds-surface-sunken'
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(hostel)}
          onFocus={() => onHover(hostel._id)}
          onBlur={() => onHover(null)}
          aria-pressed={selected || false}
          className="absolute inset-0 z-10 cursor-pointer rounded-ds-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
        >
          <span className="sr-only">Show {hostel.name} on the map</span>
        </button>

        <div className="relative size-22 shrink-0 overflow-hidden rounded-ds-inner bg-ds-photo sm:size-26">
          {photo ? (
            <Image src={photo} alt={hostel.name} fill sizes="104px" className="object-cover" />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="ds-body-m-strong text-ds-ink">
            <Link
              href={`/hostels/${hostel.slug}`}
              className="relative z-20 line-clamp-1 hover:text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
            >
              {hostel.name}
            </Link>
          </h3>

          <p className="ds-body-s line-clamp-1 text-ds-ink-muted">{hostel.area || hostel.city}</p>

          {distance ? (
            <p className="ds-body-s text-ds-ink-muted">
              {distance} to {campusName}
              {band ? `, ${band}` : ''}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <p className="ds-body-m-strong tabular-nums text-ds-ink">
              {price > 0 ? formatPKR(price) : 'Rent on request'}
            </p>
            <Badge variant={hostel.verified ? 'solid' : 'outline'}>
              {hostel.verified ? 'Verified' : 'Not verified'}
            </Badge>
            <Chip>{hostel.gender}</Chip>
          </div>
        </div>
      </div>
    </li>
  );
}

export default memo(ResultCard);
