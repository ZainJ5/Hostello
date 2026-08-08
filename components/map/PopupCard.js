'use client';

import { memo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Feedback';
import HostelImage from '@/components/ui/HostelImage';
import { formatPKR } from '@/lib/utils';
import { formatDistance } from './filters';

const GENDER_TONE = { Female: 'accent', Male: 'info', Mixed: 'brand' };

/**
 * Contents of the marker popup. Rendered through a React portal into the node
 * Leaflet owns, so `next/link` and `next/image` behave exactly as they do
 * anywhere else on the site.
 */
function PopupCard({ hostel, campus, onResize }) {
  // Leaflet measures the popup when it opens, i.e. before React has filled the
  // portal. Re-measure once the content is in the DOM and again when the photo
  // settles, otherwise the tip sits off-centre.
  useEffect(() => {
    const id = requestAnimationFrame(() => onResize?.());
    return () => cancelAnimationFrame(id);
  }, [hostel?._id, onResize]);

  if (!hostel) return null;

  const photo = hostel.images?.[0] || '';
  const price = Number(hostel.price) || 0;

  return (
    <article className="relative w-[250px] text-left">
      <div className="relative h-[116px] w-full overflow-hidden bg-muted">
        <HostelImage
          src={photo}
          name={hostel.name}
          alt={hostel.name}
          fill
          sizes="250px"
          className="transition-transform duration-300"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/55 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          <Badge tone={GENDER_TONE[hostel.gender] || 'neutral'} size="sm" className="shadow-sm">
            {hostel.gender}
          </Badge>
          {hostel.verified && (
            <Badge tone="success" size="sm" className="shadow-sm">
              Verified
            </Badge>
          )}
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-sm leading-snug font-semibold text-foreground">
          <Link
            href={`/hostels/${hostel.slug}`}
            className="line-clamp-2 rounded-sm after:absolute after:inset-0 after:content-[''] hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand-300"
          >
            {hostel.name}
          </Link>
        </h3>

        {hostel.area && (
          <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-px size-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{hostel.area}</span>
          </p>
        )}

        <div className="mt-2">
          {hostel.reviewCount > 0 ? (
            <Rating value={hostel.rating} count={hostel.reviewCount} size="sm" />
          ) : (
            <span className="text-xs text-muted-foreground">No reviews yet</span>
          )}
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-border pt-2.5">
          <div className="min-w-0">
            <p className="tabular text-sm font-bold text-foreground">
              {price > 0 ? formatPKR(price) : 'Price on request'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {campus && Number.isFinite(hostel.campusDistanceKm)
                ? `${formatDistance(hostel.campusDistanceKm)} from ${campus.name}`
                : 'per month'}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}

export default memo(PopupCard);
