import Booking, { BOOKING_STATUSES } from '@/models/Booking';
import Hostel from '@/models/Hostel';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import BookingsTable from '@/components/admin/bookings/BookingsTable';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Bookings' };

const PER_PAGE = 20;

const SORTS = {
  studentName: 'studentName',
  moveInDate: 'moveInDate',
  status: 'status',
  createdAt: 'createdAt',
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminBookingsPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const sortKey = SORTS[sp.sort] ? sp.sort : 'createdAt';
  const dir = sp.dir === 'asc' ? 1 : -1;

  const query = {};
  if (sp.status && BOOKING_STATUSES.includes(sp.status)) query.status = sp.status;
  if (sp.hostel) query.hostelId = sp.hostel;
  if (sp.q) {
    const rx = new RegExp(escapeRegex(String(sp.q).trim()), 'i');
    query.$or = [{ studentName: rx }, { studentEmail: rx }, { studentPhone: rx }, { message: rx }];
  }
  if (sp.from || sp.to) {
    query.createdAt = {};
    if (sp.from) query.createdAt.$gte = new Date(`${sp.from}T00:00:00.000Z`);
    if (sp.to) query.createdAt.$lte = new Date(`${sp.to}T23:59:59.999Z`);
  }

  const [total, docs, statusCounts, hostelIds] = await Promise.all([
    Booking.countDocuments(query),
    Booking.find(query)
      .sort({ [SORTS[sortKey]]: dir, _id: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .populate('hostelId', 'name slug city')
      .lean(),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Booking.distinct('hostelId'),
  ]);

  const hostelOptions = hostelIds.length
    ? (
        await Hostel.find({ _id: { $in: hostelIds } })
          .sort({ name: 1 })
          .select('name')
          .lean()
      ).map((h) => ({ value: String(h._id), label: h.name }))
    : [];

  const rows = docs.map((d) => ({
    ...d,
    hostel: d.hostelId || null,
    hostelId: d.hostelId?._id ? String(d.hostelId._id) : null,
  }));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Marketplace"
        title="Bookings"
        description="Every enquiry students have sent, across every listing. Open a row for the full request."
      />

      <BookingsTable
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        hostels={hostelOptions}
        stats={Object.fromEntries(statusCounts.map((r) => [r._id, r.n]))}
      />
    </div>
  );
}
