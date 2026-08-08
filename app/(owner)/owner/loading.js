import {
  HeaderSkeleton,
  StatRowSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from '@/components/owner/skeletons';

export default function OwnerDashboardLoading() {
  return (
    <>
      <HeaderSkeleton />
      <StatRowSkeleton count={6} />
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={4} />
      </div>
      <div className="mt-4">
        <TableSkeleton rows={6} />
      </div>
    </>
  );
}
