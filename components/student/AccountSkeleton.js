import { Skeleton } from '@/components/ds/Feedback';

/**
 * Loading state for every account route. It draws the frame the page is about
 * to fill: heading block, the rail, then a stack of rows at roughly the right
 * height, so nothing jumps when the data lands.
 */
export default function AccountSkeleton({ rows = 3 }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-prose" />
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-32 lg:w-full" />
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    </div>
  );
}
