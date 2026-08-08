import { Skeleton } from '@/components/ui/Feedback';

/** Sized like a typical admin screen: header, stat row, then a data panel. */
export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[var(--radius-card)]" />
        ))}
      </div>

      <Skeleton className="h-14 rounded-[var(--radius-card)]" />
      <Skeleton className="h-[28rem] rounded-[var(--radius-card)]" />
    </div>
  );
}
