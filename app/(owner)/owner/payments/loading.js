import { HeaderSkeleton, StatRowSkeleton, TableSkeleton } from '@/components/owner/skeletons';

export default function OwnerPaymentsLoading() {
  return (
    <>
      <HeaderSkeleton />
      <StatRowSkeleton count={4} />
      <div className="mt-5">
        <TableSkeleton rows={6} />
      </div>
    </>
  );
}
