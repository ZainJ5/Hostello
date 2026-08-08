import { serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import BookingsBoard from '@/components/owner/BookingsBoard';
import { getOwnerContext, getOwnerBookings } from '../../_lib/owner-data';

export const metadata = { title: 'Bookings' };

export default async function OwnerBookingsPage({ searchParams }) {
  const sp = await searchParams;
  const status = typeof sp?.status === 'string' ? sp.status : 'all';
  const hostelId = typeof sp?.hostelId === 'string' ? sp.hostelId : 'all';

  const { ownerId } = await getOwnerContext(sp?.ownerId);
  const data = serialize(await getOwnerBookings(ownerId, { status, hostelId }));

  return (
    <>
      <PageHeader
        title="Booking requests"
        description={
          data.total === 0
            ? 'Every enquiry a student sends about your listings arrives here.'
            : `${data.total} request${data.total === 1 ? '' : 's'} · ${
                data.counts.pending || 0
              } waiting on you`
        }
      />
      <BookingsBoard
        bookings={data.bookings}
        hostels={data.hostels}
        counts={data.counts}
        total={data.total}
        filters={{ status, hostelId }}
      />
    </>
  );
}
