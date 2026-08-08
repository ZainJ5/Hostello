import { Skeleton } from '@/components/ui/Feedback';

function CardSkeleton() {
  return (
    <div className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-2.5">
      <Skeleton className="size-[92px] shrink-0 rounded-xl sm:size-[104px]" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}

/** Stand-in for the Leaflet canvas while its client bundle downloads. */
export function MapCanvasSkeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

/**
 * Shaped like the real split view so the route swap does not jump. Used by
 * `app/(public)/map/loading.js`.
 */
export default function MapSkeleton() {
  return (
    <div className="flex h-[calc(100dvh_-_4rem)] w-full overflow-hidden bg-background">
      <aside className="hidden w-[40%] min-w-[380px] max-w-[560px] shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="border-b border-border bg-surface px-4 py-2.5">
          <Skeleton className="h-11 w-32 rounded-xl" />
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
          </div>
          <Skeleton className="mt-3.5 h-12 rounded-xl" />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden px-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </aside>

      <div className="bg-grid relative min-w-0 flex-1 bg-surface-sunken">
        <MapCanvasSkeleton />
        <div className="absolute inset-x-0 bottom-0 h-[17%] rounded-t-[var(--radius-panel)] border border-b-0 border-border bg-surface p-3 shadow-xl lg:hidden">
          <span className="mx-auto block h-1.5 w-11 rounded-full bg-border-strong" />
          <Skeleton className="mt-4 h-5 w-44" />
        </div>
      </div>
    </div>
  );
}
