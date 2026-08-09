import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Figma photo-slot/4x3 18:12.
 *
 * A fixed 4:3 crop, so mismatched owner uploads cannot change card height.
 * Owner photography is phone quality and always will be: one listing photo is
 * a picture of a printed banner and another carries a TikTok watermark, so
 * hierarchy never depends on photo quality.
 *
 * The brown stand-in is the mean colour of real Hostello listing photography.
 * Empty is a designed state, not a missing image.
 *
 * NO SCRIM. With gradients ruled out, a flat ink band across a photo reads as
 * a rendering bug, and it is unnecessary because every element that sits on a
 * photo carries its own fill.
 */
export default function PhotoSlot({ src, alt, priority = false, children, className }) {
  return (
    <div
      className={cn(
        'relative flex aspect-[4/3] w-full flex-col items-start justify-end overflow-hidden bg-ds-photo p-3',
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      ) : null}
      {children ? <div className="relative flex gap-2">{children}</div> : null}
    </div>
  );
}
