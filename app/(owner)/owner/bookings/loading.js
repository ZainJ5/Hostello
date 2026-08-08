import { HeaderSkeleton, TabsSkeleton, TableSkeleton } from '@/components/owner/skeletons';

export default function OwnerBookingsLoading() {
  return (
    <>
      <HeaderSkeleton />
      <TabsSkeleton count={6} />
      <TableSkeleton rows={8} />
    </>
  );
}
