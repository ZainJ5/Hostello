import Card from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-36" />
        <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      </div>

      <Card className="p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
        <div className="mt-6 flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-11 flex-1 rounded-xl" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <Skeleton className="h-5 w-24" />
        <div className="mt-6 space-y-5">
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>
      </Card>

      <Skeleton className="h-32 rounded-[var(--radius-panel)]" />
    </div>
  );
}
