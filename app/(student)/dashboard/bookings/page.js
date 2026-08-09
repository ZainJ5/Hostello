import { connectDB } from '@/lib/db';
import { serialize } from '@/lib/utils';
import Booking from '@/models/Booking';
import { HOSTEL_FIELDS, redactContact } from '@/app/api/bookings/_lib/shape';
import BookingsClient from '@/components/student/BookingsClient';
import { BOOKING_STATUSES } from '@/components/student/constants';
import { requireStudentUser } from '../../_lib/session';

export const metadata = { title: 'My bookings' };

export default async function BookingsPage({ searchParams }) {
  const { user } = await requireStudentUser('/dashboard/bookings', 'name');
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
    <div className="space-y-6">
      <header>
        <h1 className="text-h2 text-foreground">My bookings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          Every request you have sent, with the owner&apos;s reply and their contact
          details once a stay is confirmed.
        </p>
      </header>

      <BookingsClient
        bookings={serialize(rows.map(redactContact))}
        initialStatus={status}
        openId={openId}
      />
    </div>
  );
}
