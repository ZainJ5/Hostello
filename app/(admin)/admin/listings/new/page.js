import { ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Hostel, { FACILITIES, ROOM_TYPES } from '@/models/Hostel';
import User from '@/models/User';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import PageHeader from '@/components/admin/PageHeader';
import HostelForm from '@/components/admin/listings/HostelForm';

export const metadata = { title: 'New listing' };

export default async function NewListingPage() {
  await requireAdminPage();

  const [owners, cities, universities] = await Promise.all([
    User.find({ role: 'owner' }).sort({ name: 1 }).select('name email').lean(),
    Hostel.distinct('city'),
    Hostel.distinct('universities'),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Listings"
        title="New listing"
        description="Create a hostel by hand. Useful for imports, phone submissions and anything an owner cannot do themselves."
        actions={
          <Button href="/admin/listings" variant="secondary" size="sm">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to listings
          </Button>
        }
      />

      <HostelForm
        mode="create"
        owners={owners.map((o) => ({ value: String(o._id), label: o.name || o.email }))}
        cities={cities.filter(Boolean).sort()}
        universities={universities.filter(Boolean).sort()}
        facilities={FACILITIES}
        roomTypes={ROOM_TYPES}
      />
    </div>
  );
}
