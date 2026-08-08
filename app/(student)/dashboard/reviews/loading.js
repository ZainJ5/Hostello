import Card from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-4 h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-5/6" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
