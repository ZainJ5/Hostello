import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import HostelImage from '@/components/ui/HostelImage';
import { cn } from '@/lib/utils';

/**
 * City tile for the "browse by city" grid. The photo is a real listing from
 * that city rather than stock, so the shelf always reflects what is actually
 * on the platform.
 */
export default function CityCard({ city, count = 0, photo, className }) {
  return (
    <Link
      href={`/hostels?city=${encodeURIComponent(city)}`}
      className={cn(
        'group relative isolate block overflow-hidden rounded-[var(--radius-card)] border border-border',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-lg',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted sm:aspect-[3/4]">
        <div className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-105">
          <HostelImage
            src={photo}
            name={city}
            alt={`Student hostels in ${city}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-bold text-white">{city}</p>
            <p className="tabular text-sm text-white/75">
              {count} {count === 1 ? 'hostel' : 'hostels'}
            </p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors duration-200 group-hover:bg-white group-hover:text-slate-900">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
