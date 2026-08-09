'use client';

import { memo, useEffect } from 'react';
import Link from 'next/link';
import Badge from '@/components/ds/Badge';
import Chip from '@/components/ds/Chip';
import PhotoSlot from '@/components/ds/PhotoSlot';
import { formatPKR } from '@/lib/utils';
import { distanceBand, formatKm } from '@/lib/distance';

/**
 * Contents of the marker popup. Rendered through a React portal into the node
 * Leaflet owns, so `next/link` and `next/image` behave exactly as they do
 * anywhere else on the site.
 *
 * This is the listing card cut down to a popup: the same photo slot, the same
 * verified badge, the same rent figure. Nothing here is a second visual
 * language for the same object.
 */
function PopupCard({ hostel, campus, onResize }) {
  // Leaflet measures the popup when it opens, which is before React has filled
  // the portal. Re-measure once the content is in the DOM, otherwise the tip
  // sits off centre.
  useEffect(() => {
    const id = requestAnimationFrame(() => onResize?.());
    return () => cancelAnimationFrame(id);
  }, [hostel?._id, onResize]);

  if (!hostel) return null;

  const photo = hostel.images?.[0] || null;
  const price = Number(hostel.price) || 0;
  const km = Number(hostel.campusDistanceKm);
  const distance = campus && Number.isFinite(km) ? formatKm(km) : null;
  const band = distance ? distanceBand(km) : null;

  return (
    <article className="relative w-62.5 text-left">
      <PhotoSlot src={photo} alt={hostel.name}>
        <Badge variant={hostel.verified ? 'solid' : 'outline'}>
          {hostel.verified ? 'Verified' : 'Not verified'}
        </Badge>
      </PhotoSlot>

      <div className="flex flex-col gap-2 p-3">
        <h3 className="ds-body-m-strong text-ds-ink">
          <Link
            href={`/hostels/${hostel.slug}`}
            className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
          >
            {hostel.name}
          </Link>
        </h3>

        {hostel.area ? (
          <p className="ds-body-s line-clamp-1 text-ds-ink-muted">{hostel.area}</p>
        ) : null}

        {distance ? (
          <p className="ds-body-s text-ds-ink-muted">
            {distance} to {campus.name}
            {band ? `, ${band}` : ''}
          </p>
        ) : null}

        <div aria-hidden="true" className="h-px w-full bg-ds-hairline" />

        <div className="flex flex-col gap-1">
          <p className="ds-figure-l text-ds-ink">
            {price > 0 ? formatPKR(price) : 'Rent on request'}
          </p>
          <p className="ds-body-s text-ds-ink-muted">per month.</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip>{hostel.gender}</Chip>
          {(hostel.facilities || []).includes('Meals') ? <Chip>Mess included</Chip> : null}
        </div>
      </div>
    </article>
  );
}

export default memo(PopupCard);
