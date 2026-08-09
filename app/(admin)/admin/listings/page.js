import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Hostel from '@/models/Hostel';
import User from '@/models/User';
import Booking from '@/models/Booking';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import ListingsTable from '@/components/admin/listings/ListingsTable';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Listings' };

const PER_PAGE = 20;

const SORTS = {
  name: 'name',
  status: 'status',
  price: 'price',
  views: 'views',
  rating: 'rating',
  createdAt: 'createdAt',
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function AdminListingsPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const sortKey = SORTS[sp.sort] ? sp.sort : 'createdAt';
  const dir = sp.dir === 'asc' ? 1 : -1;

  const query = {};
  if (sp.status) query.status = sp.status;
  if (sp.city) query.city = sp.city;
  if (sp.university) query.universities = sp.university;
  if (sp.gender) query.gender = sp.gender;
  if (sp.owner) query.ownerId = sp.owner === 'none' ? null : sp.owner;
  if (sp.q) {
    const rx = new RegExp(escapeRegex(String(sp.q).trim()), 'i');
    query.$or = [{ name: rx }, { area: rx }, { address: rx }, { slug: rx }, { city: rx }];
  }

  const [total, docs, cities, universities, owners] = await Promise.all([
    Hostel.countDocuments(query),
    Hostel.find(query)
      .sort({ [SORTS[sortKey]]: dir, _id: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .populate('ownerId', 'name email')
      .lean(),
    Hostel.distinct('city'),
    Hostel.distinct('universities'),
    User.find({ role: 'owner' }).sort({ name: 1 }).select('name email').lean(),
  ]);

  // Bookings are a separate collection; count them for this page only.
  const ids = docs.map((d) => d._id);
  const bookingCounts = ids.length
    ? await Booking.aggregate([
        { $match: { hostelId: { $in: ids } } },
        { $group: { _id: '$hostelId', n: { $sum: 1 } } },
      ])
    : [];
  const bookingBy = new Map(bookingCounts.map((b) => [String(b._id), b.n]));

  const rows = docs.map((d) => ({
    ...d,
    owner: d.ownerId || null,
    ownerId: d.ownerId?._id ? String(d.ownerId._id) : null,
    bookings: bookingBy.get(String(d._id)) || 0,
  }));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Marketplace"
        title="Listings"
        description="Every hostel on the platform, in any state: draft, in review, live, suspended or rejected."
        actions={
          <Button href="/admin/listings/new" size="sm">
            <Plus className="size-4" aria-hidden="true" />
            New listing
          </Button>
        }
      />

      <ListingsTable
        rows={serialize(rows)}
        total={total}
        page={Math.min(page, pages)}
        pages={pages}
        perPage={PER_PAGE}
        facets={{
          cities: cities.filter(Boolean).sort(),
          universities: universities.filter(Boolean).sort(),
          owners: owners.map((o) => ({ value: String(o._id), label: o.name || o.email })),
        }}
      />
    </div>
  );
}
