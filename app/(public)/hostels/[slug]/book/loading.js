import Card from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Feedback';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-10 w-full max-w-md" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Card className="p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
            </div>
            <Skeleton className="h-11 rounded-xl" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-11 rounded-xl" />
            </div>
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-32" />
          </div>
        </Card>
      </div>
    </div>
  );
}
