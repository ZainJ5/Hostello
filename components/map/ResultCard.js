'use client';

import { memo } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, Star } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import HostelImage from '@/components/ui/HostelImage';
import { cn, formatPKR } from '@/lib/utils';
import { formatDistance } from './filters';

const GENDER_TONE = { Female: 'accent', Male: 'info', Mixed: 'brand' };

/**
 * Compact horizontal card — photo left, details right. The column is ~40% of
 * the viewport, far too narrow for the full grid card used on /hostels.
 *
 * Two interactive targets, deliberately not nested: a full-bleed button that
 * pans the map, and the name as a real link to the listing. Keyboard order is
 * button → link, and both carry their own focus ring.
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
  const distance = Number(hostel.campusDistanceKm);

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
          'group relative flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-2.5',
          'transition-[border-color,box-shadow,background-color] duration-200',
          'hover:border-border-strong hover:shadow-md',
          'data-[active]:border-brand-400 data-[active]:shadow-md',
          'data-[selected]:border-brand-600 data-[selected]:bg-brand-50/60 data-[selected]:shadow-brand',
          'dark:data-[selected]:bg-brand-950/40'
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(hostel)}
          onFocus={() => onHover(hostel._id)}
          onBlur={() => onHover(null)}
          aria-pressed={selected || false}
          className="absolute inset-0 z-10 cursor-pointer rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="sr-only">Show {hostel.name} on the map</span>
        </button>

        <div className="relative size-[92px] shrink-0 overflow-hidden rounded-xl bg-muted sm:size-[104px]">
          <HostelImage
            src={hostel.images?.[0] || ''}
            name={hostel.name}
            alt={hostel.name}
            fill
            sizes="104px"
            className="transition-transform duration-300 group-hover:scale-[1.04]"
          />
          {hostel.featured && (
            <span className="absolute left-1 top-1 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              Featured
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <h3 className="text-sm leading-snug font-semibold text-foreground">
            <Link
              href={`/hostels/${hostel.slug}`}
              className="relative z-20 line-clamp-1 rounded-sm transition-colors duration-150 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:text-brand-300"
            >
              {hostel.name}
            </Link>
          </h3>

          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{hostel.area || hostel.city}</span>
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={GENDER_TONE[hostel.gender] || 'neutral'} size="sm">
              {hostel.gender}
            </Badge>
            {hostel.reviewCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                aria-label={`Rated ${Number(hostel.rating).toFixed(1)} out of 5 from ${hostel.reviewCount} reviews`}
              >
                <Star className="size-3.5 fill-accent-400 text-accent-400" aria-hidden="true" />
                <span className="tabular font-semibold text-foreground">
                  {Number(hostel.rating).toFixed(1)}
                </span>
                <span className="tabular">({hostel.reviewCount})</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">New listing</span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
            <p className="tabular text-sm font-bold text-foreground">
              {price > 0 ? (
                <>
                  {formatPKR(price)}
                  <span className="text-xs font-medium text-muted-foreground"> /mo</span>
                </>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  Price on request
                </span>
              )}
            </p>

            {showDistance && Number.isFinite(distance) && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-300"
                title={campusName ? `Distance from ${campusName}` : undefined}
              >
                <Navigation className="size-3" aria-hidden="true" />
                <span className="tabular">{formatDistance(distance)}</span>
                <span className="sr-only">from {campusName}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default memo(ResultCard);
