import { Skeleton } from '@/components/ui/Feedback';
import { HostelGridSkeleton } from '@/components/hostels/HostelCardSkeleton';

/**
 * Mirrors `/hostels` exactly: same page padding, same header block, same
 * 19rem rail plus fluid results split, same 12-card grid. The real page then
 * swaps in without a single pixel of movement.
 */
export default function HostelsLoading() {
  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-11 w-[22rem] max-w-full" />
        <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-4/5 max-w-xl" />
        <div className="mt-5 flex flex-wrap gap-5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] xl:gap-10">
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-6 rounded-[var(--radius-panel)] border border-border bg-surface p-5 shadow-sm">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-11 w-full rounded-xl" />
            {[4, 1, 1, 1, 6].map((rowCount, section) => (
              <div key={section} className="space-y-2.5 border-t border-border pt-5">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: rowCount }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div>
              <Skeleton className="h-7 w-64" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-11 w-28 rounded-xl lg:hidden" />
              <Skeleton className="hidden h-11 w-24 rounded-xl sm:block" />
              <Skeleton className="h-11 w-[11.5rem] rounded-xl" />
              <Skeleton className="h-11 w-22 rounded-xl" />
            </div>
          </div>

          <div className="mt-6">
            <HostelGridSkeleton count={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
