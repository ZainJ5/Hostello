import { Skeleton } from '@/components/ds/Feedback';

function CardSkeleton() {
  return (
    <div className="ds-elevated flex gap-3 rounded-ds-inner p-3">
      <Skeleton className="size-22 shrink-0 sm:size-26" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-5 w-28" />
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
    <div className="flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden bg-ds-surface">
      <div className="shrink-0 border-b border-solid border-ds-hairline px-4 py-3 sm:px-6 lg:px-10 lg:py-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-64" />
        <Skeleton className="mt-3 hidden h-4 w-xl lg:block" />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[40%] min-w-96 max-w-140 shrink-0 flex-col border-r border-solid border-ds-hairline bg-ds-surface lg:flex">
          <div className="border-b border-solid border-ds-hairline px-4 py-4">
            <Skeleton className="h-11 w-28" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="mt-4 h-12" />
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1 bg-ds-surface-sunken">
          <MapCanvasSkeleton />
          <div className="absolute inset-x-0 bottom-0 h-[17%] rounded-t-ds-control border border-b-0 border-solid border-ds-hairline bg-ds-surface p-3 lg:hidden">
            <span aria-hidden="true" className="mx-auto block h-1.5 w-11 rounded-ds-chip bg-ds-control" />
            <Skeleton className="mt-4 h-5 w-44" />
          </div>
        </div>
      </div>
    </div>
  );
}
