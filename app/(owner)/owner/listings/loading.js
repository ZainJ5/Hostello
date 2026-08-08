import { HeaderSkeleton, TabsSkeleton, CardGridSkeleton } from '@/components/owner/skeletons';

export default function OwnerListingsLoading() {
  return (
    <>
      <HeaderSkeleton />
      <TabsSkeleton count={5} />
      <CardGridSkeleton count={6} />
    </>
  );
}
