import { HeaderSkeleton, StatRowSkeleton, ChartSkeleton } from '@/components/owner/skeletons';

export default function OwnerAnalyticsLoading() {
  return (
    <>
      <HeaderSkeleton />
      <StatRowSkeleton count={4} />
      <div className="mt-4 space-y-4">
        <ChartSkeleton height={320} />
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartSkeleton height={280} />
          <ChartSkeleton height={280} />
        </div>
      </div>
    </>
  );
}
