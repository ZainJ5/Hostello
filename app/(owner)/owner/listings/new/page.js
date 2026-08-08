import { notFound, redirect } from 'next/navigation';
import { FACILITIES, ROOM_TYPES } from '@/models/Hostel';
import { serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import ListingWizard from '@/components/owner/ListingWizard';
import { getOwnerContext, loadOwnedHostel } from '../../../_lib/owner-data';

export const metadata = { title: 'Add a hostel' };

/**
 * `?id=` resumes an existing draft. The draft is loaded through
 * `loadOwnedHostel`, so a guessed id belonging to another owner answers 404
 * rather than opening someone else's listing in an editable form.
 */
export default async function NewListingPage({ searchParams }) {
  const sp = await searchParams;
  const { session } = await getOwnerContext(sp?.ownerId);

  let listing = null;
  if (sp?.id) {
    let doc;
    try {
      doc = await loadOwnedHostel(sp.id, session);
    } catch {
      // Missing, or someone else's — the console answers the same either way.
      notFound();
    }
    // A listing that has moved past `draft` belongs in the editor, not the
    // wizard — the wizard's job is finishing a first-time setup.
    if (doc.status !== 'draft') redirect(`/owner/listings/${doc._id}/edit`);
    listing = serialize(doc.toObject());
  }

  return (
    <>
      <PageHeader
        title={listing ? 'Finish your listing' : 'Add a hostel'}
        description="Six short steps. Everything saves as you go, so you can stop and come back whenever you like."
        back={{ href: '/owner/listings', label: 'Back to listings' }}
      />
      <ListingWizard listing={listing} facilities={FACILITIES} roomTypes={ROOM_TYPES} />
    </>
  );
}
