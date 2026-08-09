import { notFound } from 'next/navigation';
import { FACILITIES, ROOM_TYPES } from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Upload } from 'lucide-react';
import PageHeader from '@/components/owner/PageHeader';
import ListingEditor from '@/components/owner/ListingEditor';
import { getOwnerContext, loadOwnedHostel } from '../../../../_lib/owner-data';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const { session } = await getOwnerContext();
    const listing = await loadOwnedHostel(id, session);
    return { title: `Edit ${listing.name}` };
  } catch {
    return { title: 'Edit listing' };
  }
}

export default async function EditListingPage({ params }) {
  const { id } = await params;
  // Ownership is enforced inside loadOwnedHostel: a listing belonging to
  // another owner is indistinguishable from one that does not exist.
  const { session } = await getOwnerContext();
  let doc;
  try {
    doc = await loadOwnedHostel(id, session);
  } catch {
    notFound();
  }
  const listing = serialize(doc.toObject());

  return (
    <>
      <PageHeader
        title={listing.name || 'Untitled listing'}
        description="Edit any section. Changes autosave, and a live listing stays live while you work."
        back={{ href: '/owner/listings', label: 'Back to listings' }}
        action={
          listing.status === 'pending_payment' ? (
            <Button href={`/owner/listings/${listing._id}/payment`} variant="accent">
              <Upload className="size-4.5" aria-hidden="true" />
              Upload payment proof
            </Button>
          ) : null
        }
      />
      <ListingEditor listing={listing} facilities={FACILITIES} roomTypes={ROOM_TYPES} />
    </>
  );
}
