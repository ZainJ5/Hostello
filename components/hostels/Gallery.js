'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import Badge from '@/components/ds/Badge';
import PhotoSlot from '@/components/ds/PhotoSlot';
import { cn } from '@/lib/utils';
import { useDialog } from './use-dialog';

/**
 * Figma section/photos inside page/hostel-detail 85:2009: three photo-slot/4x3
 * frames across the 1280 column, the verified badge on the first one, and a
 * line of type underneath that says where the photographs came from.
 *
 * Three, not a mosaic. Owner photography is phone quality and always will be,
 * and a hero-plus-thumbnails mosaic silently ranks one photo above the others
 * when there is no reason to. Equal slots say the pictures are equal.
 *
 * NO SCRIM. Every element that sits on a photo carries its own fill, per
 * photo-slot/4x3 18:12.
 *
 * On a phone the three become a native scroll-snap carousel, so swiping has
 * real momentum and no gesture handling ships to the browser.
 */
export default function Gallery({ images = [], name, verified = false, className }) {
  const photos = (images || []).filter(Boolean);
  const [lightbox, setLightbox] = useState(-1);
  const [slide, setSlide] = useState(0);

  const open = useCallback((i) => setLightbox(i), [setLightbox]);
  const close = useCallback(() => setLightbox(-1), [setLightbox]);

  const shown = photos.slice(0, 3);
  const extra = photos.length - shown.length;

  function onScroll(e) {
    const el = e.currentTarget;
    setSlide(Math.min(photos.length - 1, Math.max(0, Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))));
  }

  // Nothing to open, and nothing to promise. The empty slot is a designed
  // state rather than a broken image.
  if (!photos.length) {
    return (
      <div className={cn('w-full', className)}>
        <PhotoSlot src={null} alt="" className="rounded-ds-inner">
          <Badge variant="outline">No photos yet</Badge>
        </PhotoSlot>
      </div>
    );
  }

  const slot = (src, i) => (
    <button
      key={src}
      type="button"
      onClick={() => open(i)}
      aria-label={`Open photo ${i + 1} of ${photos.length} full screen`}
      className="relative block w-full shrink-0 cursor-pointer snap-center overflow-hidden rounded-ds-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt"
    >
      <PhotoSlot src={src} alt={`${name}, photo ${i + 1}`} priority={i === 0}>
        {i === 0 ? (
          <Badge variant={verified ? 'solid' : 'outline'}>
            {verified ? 'Verified' : 'Not verified'}
          </Badge>
        ) : null}
        {i === 2 && extra > 0 ? <Badge variant="outline">{extra} more</Badge> : null}
      </PhotoSlot>
    </button>
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Phone: one slot at a time, swipeable. */}
      <div
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain sm:hidden"
      >
        {photos.map((src, i) => (
          <div key={src} className="w-full shrink-0 snap-center">
            {slot(src, i)}
          </div>
        ))}
      </div>

      {photos.length > 1 ? (
        <p aria-live="polite" className="ds-mono-meta mt-2 text-ds-ink-muted sm:hidden">
          {slide + 1} of {photos.length}
        </p>
      ) : null}

      {/* Desktop: three equal slots. */}
      <div className="hidden gap-2 sm:grid sm:grid-cols-3">{shown.map((src, i) => slot(src, i))}</div>

      {lightbox >= 0 ? (
        <Lightbox photos={photos} name={name} index={lightbox} setIndex={setLightbox} onClose={close} />
      ) : null}
    </div>
  );
}

/**
 * Full screen viewer. Arrow keys, Escape, the scroll lock, the focus trap and
 * handing focus back to the slot that opened it all come from `useDialog`.
 */
function Lightbox({ photos, name, index, setIndex, onClose }) {
  const panelRef = useRef(null);
  const count = photos.length;

  const go = useCallback((delta) => setIndex((i) => (i + delta + count) % count), [count, setIndex]);

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

  const step = (label, delta) => (
    <button
      type="button"
      onClick={() => go(delta)}
      className={cn(
        'ds-body-m-strong ds-tap inline-flex cursor-pointer items-center justify-center px-4',
        'rounded-ds-inner border border-solid border-ds-control bg-ds-surface-raised text-ds-ink',
        'hover:border-ds-cobalt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${name}, photo ${index + 1} of ${count}`}
      tabIndex={-1}
      className="fixed inset-0 z-100 flex flex-col bg-ds-surface outline-none"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-solid border-ds-hairline px-4 py-3">
        <p aria-live="polite" className="ds-mono-meta text-ds-ink-muted">
          {index + 1} of {count}
        </p>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            'ds-body-m-strong ds-tap inline-flex cursor-pointer items-center justify-center px-4',
            'rounded-ds-inner border border-solid border-ds-ink bg-ds-surface-raised text-ds-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-cobalt'
          )}
        >
          Close
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-ds-photo">
        <Image
          key={photos[index]}
          src={photos[index]}
          alt={`${name}, photo ${index + 1} of ${count}`}
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>

      {count > 1 ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-solid border-ds-hairline px-4 py-3">
          {step('Previous', -1)}
          {step('Next', 1)}
        </div>
      ) : null}
    </div>
  );
}
