'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import HostelImage from '@/components/ui/HostelImage';
import { cn } from '@/lib/utils';
import { useDialog } from './use-dialog';

/**
 * Photo gallery for the detail page.
 *
 * Desktop adapts to how many photos a listing actually has: one hero, a hero
 * plus a stacked pair, or a hero plus a 2×2 grid. Every tile declares its
 * aspect ratio up front, so the block occupies its final height before a
 * single byte of image arrives.
 *
 * Mobile is a native scroll-snap carousel (real momentum swiping, no JS
 * gesture handling) with a live "3 / 4" counter and dot indicators.
 */
export default function Gallery({ images = [], name }) {
  const photos = images.filter(Boolean);
  const [lightbox, setLightbox] = useState(-1);
  const [slide, setSlide] = useState(0);
  const trackRef = useRef(null);

  const open = useCallback((i) => setLightbox(i), []);
  const close = useCallback(() => setLightbox(-1), []);

  function onTrackScroll(e) {
    const el = e.currentTarget;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    setSlide(Math.min(photos.length - 1, Math.max(0, i)));
  }

  const hero = photos[0];
  const rest = photos.slice(1, 5);
  const heroAlt = `${name}, main photo`;

  return (
    <section aria-label={`Photos of ${name}`} className="relative">
      {/* ── Mobile: swipeable carousel ── */}
      <div className="relative -mx-4 sm:-mx-6 lg:hidden">
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {(photos.length ? photos : [null]).map((src, i) => (
            <button
              key={src || 'placeholder'}
              type="button"
              onClick={() => photos.length && open(i)}
              aria-label={photos.length ? `Open photo ${i + 1} of ${photos.length} full screen` : undefined}
              disabled={!photos.length}
              className="relative aspect-[4/3] w-full shrink-0 cursor-pointer snap-center overflow-hidden bg-muted focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
            >
              <HostelImage
                src={src}
                name={name}
                alt={`${name}, photo ${i + 1}`}
                fill
                priority={i === 0}
                sizes="100vw"
              />
            </button>
          ))}
        </div>

        {photos.length > 1 && (
          <>
            <p
              aria-live="polite"
              className="tabular pointer-events-none absolute bottom-3 right-4 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:right-6"
            >
              {slide + 1} / {photos.length}
            </p>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1.5"
            >
              {photos.map((src, i) => (
                <span
                  key={src}
                  className={cn(
                    'h-1.5 rounded-full bg-white transition-all duration-200',
                    i === slide ? 'w-5 opacity-100' : 'w-1.5 opacity-55'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Desktop: adaptive mosaic ── */}
      <div className="hidden lg:block">
        {/* Track counts are chosen so the mosaic never leaves an empty cell:
            with three thumbnails a 4×2 grid would strand the bottom-right
            slot, so those stack in a single third column instead. */}
        <div
          className={cn(
            'grid h-[26rem] gap-2 overflow-hidden rounded-[var(--radius-panel)] xl:h-[30rem]',
            rest.length === 0 && 'grid-cols-1',
            rest.length === 1 && 'grid-cols-2',
            rest.length === 2 && 'grid-cols-3 grid-rows-2',
            rest.length === 3 && 'grid-cols-3 grid-rows-3',
            rest.length >= 4 && 'grid-cols-4 grid-rows-2'
          )}
        >
          <button
            type="button"
            onClick={() => photos.length && open(0)}
            disabled={!photos.length}
            aria-label={photos.length ? 'Open photo 1 full screen' : undefined}
            className={cn(
              'group relative cursor-pointer overflow-hidden bg-muted focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring',
              rest.length === 2 && 'col-span-2 row-span-2',
              rest.length === 3 && 'col-span-2 row-span-3',
              rest.length >= 4 && 'col-span-2 row-span-2'
            )}
          >
            <HostelImage
              src={hero}
              name={name}
              alt={heroAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-slate-950/0 transition-colors duration-300 group-hover:bg-slate-950/10"
            />
          </button>

          {rest.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => open(i + 1)}
              aria-label={`Open photo ${i + 2} full screen`}
              className="group relative cursor-pointer overflow-hidden bg-muted focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
            >
              <HostelImage
                src={src}
                name={name}
                alt={`${name}, photo ${i + 2}`}
                fill
                sizes="25vw"
                className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-slate-950/0 transition-colors duration-300 group-hover:bg-slate-950/10"
              />
            </button>
          ))}
        </div>

        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => open(0)}
            className="absolute bottom-4 right-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground shadow-lg transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Expand className="size-4" aria-hidden="true" />
            Show all {photos.length} photo{photos.length === 1 ? '' : 's'}
          </button>
        )}
      </div>

      {lightbox >= 0 && (
        <Lightbox
          photos={photos}
          name={name}
          index={lightbox}
          setIndex={setLightbox}
          onClose={close}
        />
      )}
    </section>
  );
}

/**
 * Full-screen viewer. Arrow keys and Escape are wired through `useDialog`,
 * which also locks body scroll, traps Tab inside the dialog and hands focus
 * back to the thumbnail that opened it.
 */
function Lightbox({ photos, name, index, setIndex, onClose }) {
  const panelRef = useRef(null);
  const stripRef = useRef(null);
  const count = photos.length;

  const go = useCallback(
    (delta) => setIndex((i) => (i + delta + count) % count),
    [count, setIndex]
  );

  const onKey = useCallback(
    (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    },
    [go]
  );

  useDialog(true, { ref: panelRef, onClose, onKey });

  useEffect(() => {
    stripRef.current
      ?.querySelector(`[data-thumb="${index}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [index]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${name}, photo ${index + 1} of ${count}`}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 outline-none animate-fade-in"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="tabular text-sm font-medium text-white/80" aria-live="polite">
          {index + 1} / {count}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo viewer"
          className="grid size-11 cursor-pointer place-items-center rounded-xl text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute left-2 z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-4 sm:size-12"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
        )}

        <div className="relative h-full w-full max-w-6xl">
          <HostelImage
            key={photos[index]}
            src={photos[index]}
            name={name}
            alt={`${name}, photo ${index + 1} of ${count}`}
            fill
            priority
            sizes="100vw"
            className="object-contain"
          />
        </div>

        {count > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-2 z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-4 sm:size-12"
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        )}
      </div>

      {count > 1 && (
        <div
          ref={stripRef}
          className="no-scrollbar flex shrink-0 justify-start gap-2 overflow-x-auto px-4 py-4 sm:justify-center sm:px-6"
        >
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              data-thumb={i}
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={cn(
                'relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                i === index ? 'ring-2 ring-white' : 'opacity-55 hover:opacity-100'
              )}
            >
              <HostelImage src={src} name={name} alt="" fill sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
