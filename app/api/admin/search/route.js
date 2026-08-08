import { connectDB } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { handler, ok } from '@/lib/api';
import Hostel from '@/models/Hostel';
import User from '@/models/User';
import Booking from '@/models/Booking';

/** Escapes a user term so a stray `(` or `*` cannot break the regex. */
function safeRegex(term) {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

/** Powers the top-bar command search. Read-only, so no audit entry. */
export const GET = handler(async (req) => {
  await connectDB();
  await requireRole('admin');

  const term = (new URL(req.url).searchParams.get('q') || '').trim();
  if (term.length < 2) return ok({ hostels: [], users: [], bookings: [] });

  const rx = safeRegex(term);

  const [hostels, users, bookings] = await Promise.all([
    Hostel.find({ $or: [{ name: rx }, { city: rx }, { area: rx }, { slug: rx }] })
      .sort({ status: 1, name: 1 })
      .limit(5)
      .select('name city area status slug')
      .lean(),
    User.find({ $or: [{ name: rx }, { email: rx }] })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role status')
      .lean(),
    Booking.find({ $or: [{ studentName: rx }, { studentEmail: rx }] })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('studentName studentEmail status hostelId')
      .populate('hostelId', 'name')
      .lean(),
  ]);

  return ok({
    hostels: hostels.map((h) => ({
      href: `/admin/listings/${h._id}/edit`,
      title: h.name,
      subtitle: [h.area || h.city, h.status.replace(/_/g, ' ')].filter(Boolean).join(' · '),
    })),
    users: users.map((u) => ({
      href: `/admin/users/${u._id}`,
      title: u.name,
      subtitle: `${u.email} · ${u.role}`,
    })),
    bookings: bookings.map((b) => ({
      href: `/admin/bookings?q=${encodeURIComponent(b.studentEmail || b.studentName || '')}`,
      title: b.studentName || b.studentEmail,
      subtitle: `${b.hostelId?.name || 'Deleted listing'} · ${b.status}`,
    })),
  });
});
