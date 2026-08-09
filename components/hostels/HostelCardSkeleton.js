import { Skeleton } from '@/components/ds/Feedback';
import { cn } from '@/lib/utils';

/**
 * Placeholder for one card/hostel/search 18:13: a 4:3 photo slot, the name,
 * the campus distance line, a hairline, the rent pair and a chip row. Same
 * border, radius and padding rhythm as the real card, so the grid does not
 * reflow when the data lands.
 */
export default function HostelCardSkeleton({ className }) {
  return (
    <div className={cn('ds-elevated overflow-hidden rounded-ds-inner', className)}>
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div aria-hidden="true" className="h-px w-full bg-ds-hairline" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-20 rounded-ds-chip" />
          <Skeleton className="h-6 w-24 rounded-ds-chip" />
        </div>
      </div>
    </div>
  );
}

/** Matches the browse grid's 1 / 2 / 3 column rhythm at 390, 768 and 1440. */
export function HostelGridSkeleton({ count = 12, view = 'grid' }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid gap-x-6 gap-y-8',
        view === 'list' ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <HostelCardSkeleton key={i} />
      ))}
    </div>
  );
}
