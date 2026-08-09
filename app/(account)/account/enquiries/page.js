import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import Booking from '@/models/Booking';
import { HOSTEL_FIELDS, redactContact } from '@/app/api/bookings/_lib/shape';
import AccountPage from '@/components/student/AccountPage';
import EnquiriesClient from '@/components/student/EnquiriesClient';
import { BOOKING_STATUSES } from '@/components/student/constants';
import { requireStudentUser } from '../../_lib/session';

export const metadata = { title: 'Enquiries' };

export default async function EnquiriesPage({ searchParams }) {
  const { user } = await requireStudentUser('/account/enquiries', 'name');
  const sp = await searchParams;

  await connectDB();

  // Scoped by studentId: the only rows this page can ever read are the
  // caller's own, whatever is in the query string.
  const rows = await Booking.find({ studentId: user._id })
    .sort({ createdAt: -1 })
    .populate('hostelId', HOSTEL_FIELDS)
    .lean();

  const status = BOOKING_STATUSES.includes(sp?.status) ? sp.status : 'all';
  const openId = typeof sp?.booking === 'string' ? sp.booking : null;

  return (
    <AccountPage
      title="Enquiries"
      lead="Who you contacted, when, and what they said back. Hostello records that the contact happened and never sees what you and the owner said on the phone."
      current="Enquiries"
    >
      <EnquiriesClient
        bookings={serialize(rows.map(redactContact))}
        initialStatus={status}
        openId={openId}
      />
    </AccountPage>
  );
}
