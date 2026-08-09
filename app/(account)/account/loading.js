import Card from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';

/** Sized to match the overview so the page doesn't jump when data lands. */
export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <Skeleton className="mt-4 h-8 w-16" />
            <Skeleton className="mt-3 h-3 w-28" />
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-16 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div>
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80 rounded-[var(--radius-card)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
