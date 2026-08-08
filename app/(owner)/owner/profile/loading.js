import { HeaderSkeleton } from '@/components/owner/skeletons';
import { Skeleton } from '@/components/ui/Feedback';

export default function OwnerProfileLoading() {
  return (
    <>
      <HeaderSkeleton />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[560px] rounded-[var(--radius-card)]" />
        <Skeleton className="h-[480px] rounded-[var(--radius-card)]" />
      </div>
    </>
  );
}
