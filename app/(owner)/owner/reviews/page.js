import { serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import ReviewsBoard from '@/components/owner/ReviewsBoard';
import { getOwnerContext, getOwnerReviews } from '../../_lib/owner-data';

export const metadata = { title: 'Reviews' };

export default async function OwnerReviewsPage({ searchParams }) {
  const sp = await searchParams;
  const filter = typeof sp?.filter === 'string' ? sp.filter : 'all';
  const hostelId = typeof sp?.hostelId === 'string' ? sp.hostelId : 'all';

  const { ownerId } = await getOwnerContext(sp?.ownerId);
  const data = serialize(await getOwnerReviews(ownerId, { filter, hostelId }));

  return (
    <>
      <PageHeader
        title="Reviews"
        description={
          data.counts?.all
            ? `${data.counts.all} review${data.counts.all === 1 ? '' : 's'} · ${
                data.counts.unreplied || 0
              } without a reply`
            : 'What students say about your hostels, and your chance to answer.'
        }
      />
      <ReviewsBoard
        reviews={data.reviews}
        hostels={data.hostels}
        counts={data.counts || { all: 0, unreplied: 0, replied: 0, flagged: 0 }}
        average={data.average || 0}
        breakdown={data.breakdown || []}
        filters={{ filter, hostelId }}
      />
    </>
  );
}
