import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Deterministically picks one of six brand gradients from the hostel name, so
 * a given listing always renders the same placeholder rather than flickering
 * between builds.
 */
const GRADIENTS = [
  'from-brand-500 to-brand-700',
  'from-brand-400 to-brand-600',
  'from-babu to-babu-deep',
  'from-arches to-arches-deep',
  'from-hof to-hof-deep',
  'from-brand-600 to-brand-900',
];

function gradientFor(seed) {
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) {
    h = (h * 31 + String(seed).charCodeAt(i)) >>> 0;
  }
  return GRADIENTS[h % GRADIENTS.length];
}

/**
 * A listing with no uploaded photography renders a branded monogram tile
 * instead of a broken <img>, so the gap still reads as deliberate design.
 */
export default function HostelImage({
  src,
  alt,
  name,
  fill = true,
  width,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  className,
  priority = false,
}) {
  if (!src) {
    const letter = String(name || alt || 'H').trim().charAt(0).toUpperCase();
    return (
      <div
        role="img"
        aria-label={`${name || alt}, no photo available`}
        className={cn(
          'relative grid place-items-center overflow-hidden bg-gradient-to-br',
          gradientFor(name || alt || 'hostel'),
          fill ? 'absolute inset-0 size-full' : '',
          className
        )}
      >
        {/* Subtle texture so the tile doesn't read as a flat colour block. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <span className="relative font-display text-5xl font-extrabold text-white/85">
          {letter}
        </span>
        <span className="relative mt-1 text-[11px] font-medium tracking-wide text-white/60 uppercase">
          Photo coming soon
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt || name || 'Hostel photo'}
      {...(fill ? { fill: true } : { width: width || 800, height: height || 600 })}
      sizes={sizes}
      priority={priority}
      className={cn('object-cover', className)}
    />
  );
}
