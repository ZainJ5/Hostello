'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Navigation } from 'lucide-react';
import HostelImage from '@/components/ui/HostelImage';
import { cn, formatPriceRange } from '@/lib/utils';

function Star({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z" />
    </svg>
  );
}

const MAX_FACILITIES = 3;
const MAX_DOTS = 5;

/**
 * The listing tile used by the home page, search results, the map panel and
 * every "related hostels" rail.
 *
 * Photo-first and borderless, per DESIGN.md: the photo carries the visual
 * weight and the meta sits directly on the page canvas. One <Link> is
 * stretched across the card so the whole surface is clickable while the save
 * button stays independently focusable, and the 4:3 frame is reserved up front
 * so a slow photo never reflows the grid.
 */
export default function HostelCard({
  hostel,
  priority = false,
  showSave = true,
  onSave = () => {},
  className,
}) {
  const {
    slug,
    name,
    city,
    area,
    gender,
    price,
    priceMin,
    priceMax,
    rating,
    reviewCount,
    images,
    facilities,
    verified,
    featured,
    available,
    distanceKm,
  } = hostel || {};

  const [saved, setSaved] = useState(false);

  const shots = (Array.isArray(images) ? images : []).filter(Boolean);
  const list = (Array.isArray(facilities) ? facilities : []).filter(Boolean);
  const shown = list.slice(0, MAX_FACILITIES);
  const extra = list.length - shown.length;

  const low = Number(priceMin) || Number(price) || 0;
  const high = Number(priceMax) || 0;
  const reviews = Number(reviewCount) || 0;
  const distance = Number(distanceKm) || 0;

  // Most `area` values already end in the city, so don't print it twice.
  const areaText = String(area || '').trim();
  const cityText = String(city || '').trim();
  const location =
    !areaText || !cityText
      ? areaText || cityText
      : areaText.toLowerCase().includes(cityText.toLowerCase())
        ? areaText
        : `${areaText}, ${cityText}`;

  /**
   * At most one floating badge sits over a photo. Featured is the scarcer
   * signal so it outranks Verified, which covers most listings and would
   * otherwise appear on nearly every card and mean nothing.
   */
  const badge = featured ? 'Featured' : verified ? 'Verified' : null;

  function toggleSave(event) {
    event.preventDefault();
    event.stopPropagation();
    const next = !saved;
    setSaved(next); // Optimistic; the caller owns persistence.
    onSave?.(hostel, next);
  }

  return (
    <article className={cn('group relative isolate flex h-full flex-col', className)}>
      <Link
        href={`/hostels/${slug}`}
        className="absolute inset-0 z-10 rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="sr-only">{name}</span>
      </Link>

      {/* ─── Photo: ratio reserved so nothing shifts on load ─── */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-muted">
        <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.04]">
          <HostelImage
            src={shots[0]}
            name={name}
            alt={cityText ? `${name}, ${cityText}` : name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        {badge && (
          <span className="absolute left-3 top-3 inline-flex h-6 items-center rounded-full bg-surface px-2.5 text-[11px] font-semibold text-foreground shadow-md">
            {badge}
          </span>
        )}

        {showSave && (
          <button
            type="button"
            onClick={toggleSave}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
            className={cn(
              'absolute right-1.5 top-1.5 z-20 grid size-11 cursor-pointer place-items-center rounded-full',
              'transition-transform duration-200 hover:scale-110 active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
            )}
          >
            {/* A translucent dark fill keeps the white stroke readable over a
                pale photo without needing an opaque button surface. */}
            <Heart
              aria-hidden="true"
              className={cn(
                'size-6 stroke-[1.5] transition-colors duration-200',
                saved ? 'fill-brand-500 text-white' : 'fill-black/30 text-white'
              )}
            />
          </button>
        )}

        {shots.length > 1 && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5"
          >
            {shots.slice(0, MAX_DOTS).map((shot, i) => (
              <span
                key={`${i}-${shot}`}
                className={cn(
                  'size-1.5 rounded-full bg-white transition-opacity duration-200',
                  i === 0 ? 'opacity-100' : 'opacity-55'
                )}
              />
            ))}
          </div>
        )}

        {available === false && (
          <span className="absolute bottom-3 left-3 inline-flex h-6 items-center rounded-full bg-foreground/85 px-2.5 text-[11px] font-semibold text-background backdrop-blur-sm">
            Currently full
          </span>
        )}
      </div>

      {/* ─── Meta ─── */}
      <div className="flex flex-1 flex-col gap-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-[15px] font-semibold leading-snug text-foreground">
            {name}
          </h3>
          {/* A single ink star plus the figure, rather than a five-star row:
              at card scale the row reads as texture, the number reads as data. */}
          {reviews > 0 && (
            <span
              className="flex shrink-0 items-center gap-1 text-[15px] text-foreground"
              aria-label={`Rated ${Number(rating).toFixed(1)} out of 5 from ${reviews} reviews`}
            >
              <Star className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="tabular">{Number(rating).toFixed(1)}</span>
              <span className="tabular text-muted-foreground">({reviews})</span>
            </span>
          )}
        </div>

        {location && (
          <p className="line-clamp-1 text-sm text-muted-foreground">{location}</p>
        )}

        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          {gender && <span>{gender === 'Mixed' ? 'Co-ed' : `${gender} only`}</span>}
          {distance > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular inline-flex items-center gap-1">
                <Navigation className="size-3.5 shrink-0" aria-hidden="true" />
                {distance} km to campus
              </span>
            </>
          )}
        </p>

        {shown.length > 0 && (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {shown.join(' · ')}
            {extra > 0 && ` · +${extra} more`}
          </p>
        )}

        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
          <span className="tabular text-[15px] font-semibold text-foreground">
            {formatPriceRange(low, high)}
          </span>
          <span className="text-sm text-muted-foreground">/month</span>
        </p>
      </div>
    </article>
  );
}
