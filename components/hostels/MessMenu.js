import HostelImage from '@/components/ui/HostelImage';
import { cn } from '@/lib/utils';

/**
 * Weekly mess menu. `Hostel.messMenu` is a Map keyed by day; the keys are
 * whatever the owner typed, so we sort against a canonical week and fall back
 * to insertion order for anything unrecognised. Owners who photograph a
 * printed menu instead get `messMenuImages`, and some provide both.
 */
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LONG = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

function orderDays(entries) {
  const rank = (k) => {
    const i = WEEK.findIndex((d) => k.toLowerCase().startsWith(d.toLowerCase()));
    return i === -1 ? 99 : i;
  };
  return [...entries].sort((a, b) => rank(a[0]) - rank(b[0]));
}

export default function MessMenu({ menu, images = [], name, className }) {
  const entries = orderDays(Object.entries(menu || {}).filter(([, v]) => v));
  const photos = (images || []).filter(Boolean);

  if (!entries.length && !photos.length) return null;

  return (
    <div className={className}>
      {entries.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border">
          {entries.map(([day, meal], i) => (
            <li
              key={day}
              className={cn(
                'flex flex-col gap-1 px-4 py-3.5 transition-colors duration-150 sm:flex-row sm:items-baseline sm:gap-5',
                i % 2 === 1 && 'bg-surface-sunken'
              )}
            >
              <span className="w-24 shrink-0 text-sm font-semibold text-foreground">
                {LONG[day] || day}
              </span>
              <span className="min-w-0 text-sm text-pretty text-muted-foreground">{meal}</span>
            </li>
          ))}
        </ul>
      )}

      {photos.length > 0 && (
        <div className={cn('grid gap-3 sm:grid-cols-2', entries.length > 0 && 'mt-4')}>
          {photos.map((src, i) => (
            <figure
              key={src}
              className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted"
            >
              <HostelImage
                src={src}
                name={name}
                alt={`${name} — mess menu photo ${i + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, 45vw"
              />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
