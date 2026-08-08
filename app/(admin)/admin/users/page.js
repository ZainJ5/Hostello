import User, { ROLES } from '@/models/User';
import Hostel from '@/models/Hostel';
import Booking from '@/models/Booking';
import Review from '@/models/Review';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import UsersTable from '@/components/admin/users/UsersTable';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Users' };

const PER_PAGE = 20;

const SORTS = {
  name: 'name',
  role: 'role',
  status: 'status',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminUsersPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const sortKey = SORTS[sp.sort] ? sp.sort : 'createdAt';
  const dir = sp.dir === 'asc' ? 1 : -1;

  const query = {};
  if (sp.role && ROLES.includes(sp.role)) query.role = sp.role;
  if (sp.status) query.status = sp.status;
  if (sp.q) {
    const rx = new RegExp(escapeRegex(String(sp.q).trim()), 'i');
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }, { businessName: rx }];
  }

  const [total, docs, roleCounts] = await Promise.all([
    User.countDocuments(query),
    // passwordHash is select:false on the model, so it can never leak here.
    User.find(query)
      .sort({ [SORTS[sortKey]]: dir, _id: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .lean(),
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
  ]);

  const ids = docs.map((d) => d._id);
  const [listings, bookings, reviews] = ids.length
    ? await Promise.all([
        Hostel.aggregate([
          { $match: { ownerId: { $in: ids } } },
          { $group: { _id: '$ownerId', n: { $sum: 1 } } },
        ]),
        Booking.aggregate([
          { $match: { studentId: { $in: ids } } },
          { $group: { _id: '$studentId', n: { $sum: 1 } } },
        ]),
        Review.aggregate([
          { $match: { studentId: { $in: ids } } },
          { $group: { _id: '$studentId', n: { $sum: 1 } } },
        ]),
      ])
    : [[], [], []];

  const map = (arr) => new Map(arr.map((r) => [String(r._id), r.n]));
  const listingBy = map(listings);
  const bookingBy = map(bookings);
  const reviewBy = map(reviews);

  const rows = docs.map((d) => ({
    ...d,
    listings: listingBy.get(String(d._id)) || 0,
    bookings: bookingBy.get(String(d._id)) || 0,
    reviews: reviewBy.get(String(d._id)) || 0,
  }));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const byRole = Object.fromEntries(roleCounts.map((r) => [r._id, r.n]));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Every account on Hostello — students, hostel owners and admins."
      />

      <UsersTable
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        stats={{ ...byRole, total: roleCounts.reduce((a, r) => a + r.n, 0) }}
      />
    </div>
  );
}
