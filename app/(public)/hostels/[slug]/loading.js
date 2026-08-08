import { Skeleton } from '@/components/ui/Feedback';

/**
 * Mirrors the detail page's geometry — breadcrumb, title block, the 26rem
 * gallery mosaic, the content/rail split — so the real page drops in without
 * shifting anything the student is already looking at.
 */
export default function HostelDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-[85rem] px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-20">
      <Skeleton className="h-5 w-72 max-w-full" />

      <div className="mb-5 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-9 w-[26rem] max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-24 rounded-xl" />
          <Skeleton className="h-11 w-24 rounded-xl" />
        </div>
      </div>

      {/* Gallery: single frame on mobile, mosaic from lg up. */}
      <Skeleton className="-mx-4 aspect-[4/3] rounded-none sm:-mx-6 lg:hidden" />
      <div className="hidden h-[26rem] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[var(--radius-panel)] lg:grid xl:h-[30rem]">
        <Skeleton className="col-span-2 row-span-2 size-full rounded-none" />
        <Skeleton className="size-full rounded-none" />
        <Skeleton className="size-full rounded-none" />
        <Skeleton className="size-full rounded-none" />
        <Skeleton className="size-full rounded-none" />
      </div>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] xl:gap-14">
        <div className="min-w-0 space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="space-y-4 border-t border-border pt-8">
            <Skeleton className="h-7 w-64" />
            <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-xl" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-8">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-32 w-full rounded-[var(--radius-card)]" />
          </div>

          <div className="space-y-4 border-t border-border pt-8">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-44 w-full rounded-[var(--radius-panel)]" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-[var(--radius-card)]" />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden self-start lg:block">
          <Skeleton className="sticky top-24 h-[27rem] w-full rounded-[var(--radius-panel)]" />
        </div>
      </div>
    </div>
  );
}
