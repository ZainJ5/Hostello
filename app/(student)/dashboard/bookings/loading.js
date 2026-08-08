import Card from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-52" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-xl" />
        ))}
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Skeleton className="h-32 w-full shrink-0 rounded-xl sm:size-24" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="space-y-1.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-9 w-28 rounded-lg" />
                  <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
