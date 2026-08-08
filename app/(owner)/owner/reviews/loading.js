import { HeaderSkeleton, ListSkeleton } from '@/components/owner/skeletons';
import { Skeleton } from '@/components/ui/Feedback';

export default function OwnerReviewsLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mb-4 grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
      </div>
      <ListSkeleton rows={4} />
    </>
  );
}
