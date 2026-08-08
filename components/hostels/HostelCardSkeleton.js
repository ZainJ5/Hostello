import { Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

/**
 * Placeholder for one `HostelCard`: a 4:3 photo, the title/location pair, a
 * facility chip row and the price/rating footer. The outer box carries the
 * same border, radius and padding rhythm as the real card so the grid doesn't
 * reflow when data lands.
 */
export default function HostelCardSkeleton({ className }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface',
        className
      )}
    >
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Matches the browse grid's 1 / 2 / 3 column rhythm. */
export function HostelGridSkeleton({ count = 12, view = 'grid' }) {
  return (
    <div
      className={cn(
        'grid gap-5',
        view === 'list' ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <HostelCardSkeleton key={i} />
      ))}
    </div>
  );
}
