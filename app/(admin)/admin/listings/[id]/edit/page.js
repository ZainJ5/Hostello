import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { connectDB } from '@/lib/db';
import Hostel, { FACILITIES, ROOM_TYPES } from '@/models/Hostel';
import User from '@/models/User';
import Booking from '@/models/Booking';
import Review from '@/models/Review';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import HostelForm from '@/components/admin/listings/HostelForm';
import { formatCompact, serialize } from '@/lib/utils';

const OID = /^[a-f0-9]{24}$/i;

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!OID.test(id)) return { title: 'Listing' };
  await connectDB();
  const doc = await Hostel.findById(id).select('name').lean();
  return { title: doc ? `Edit ${doc.name}` : 'Listing' };
}

export default async function EditListingPage({ params }) {
  await requireAdminPage();
  const { id } = await params;
  if (!OID.test(id)) notFound();

  const hostel = await Hostel.findById(id).lean();
  if (!hostel) notFound();

  const [owners, cities, universities, bookings, reviews] = await Promise.all([
    User.find({ role: 'owner' }).sort({ name: 1 }).select('name email').lean(),
    Hostel.distinct('city'),
    Hostel.distinct('universities'),
    Booking.countDocuments({ hostelId: hostel._id }),
    Review.countDocuments({ hostelId: hostel._id, status: { $ne: 'removed' } }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Listings"
        title={hostel.name}
        description={
          <>
            {[hostel.area, hostel.city].filter(Boolean).join(' · ')} · {formatCompact(hostel.views)}{' '}
            views · {bookings} bookings · {reviews} reviews
          </>
        }
        actions={
          <>
            <StatusBadge status={hostel.status} />
            <Button
              as="a"
              href={`/hostels/${hostel.slug}`}
              target="_blank"
              rel="noreferrer"
              variant="secondary"
              size="sm"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Public page
            </Button>
            <Button href="/admin/listings" variant="ghost" size="sm">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
          </>
        }
      />

      <HostelForm
        mode="edit"
        hostel={serialize(hostel)}
        owners={owners.map((o) => ({ value: String(o._id), label: o.name || o.email }))}
        cities={cities.filter(Boolean).sort()}
        universities={universities.filter(Boolean).sort()}
        facilities={FACILITIES}
        roomTypes={ROOM_TYPES}
      />
    </div>
  );
}
