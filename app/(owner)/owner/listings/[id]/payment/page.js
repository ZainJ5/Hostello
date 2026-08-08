import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import PaymentSubmission from '@/components/owner/PaymentSubmission';
import { getOwnerContext, loadOwnedHostel, getLatestPaymentFor } from '../../../../_lib/owner-data';
import { getBillingConfig } from '../../../../_lib/billing';

export const metadata = { title: 'Listing payment' };

export default async function ListingPaymentPage({ params }) {
  const { id } = await params;
  const { session, ownerId } = await getOwnerContext();
  let doc;
  try {
    doc = await loadOwnedHostel(id, session);
  } catch {
    notFound();
  }
  const listing = serialize(doc.toObject());

  const [payment, billing] = await Promise.all([
    getLatestPaymentFor(doc.ownerId || ownerId, doc._id),
    getBillingConfig(),
  ]);

  // A draft has not been submitted yet, so there is nothing to pay for.
  if (listing.status === 'draft') {
    return (
      <>
        <PageHeader
          title="Listing payment"
          description={listing.name}
          back={{ href: '/owner/listings', label: 'Back to listings' }}
        />
        <EmptyState
          icon={FileText}
          title="Finish the listing first"
          description="Complete every step and submit it — the listing fee is only due once the listing is ready to be reviewed."
          action={
            <Button href={`/owner/listings/new?id=${listing._id}`} variant="primary">
              Continue setup
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pay the listing fee"
        description={
          <>
            {listing.name} · this is the last step before{' '}
            <Link
              href="/owner/listings"
              className="underline underline-offset-2 hover:text-foreground"
            >
              your listing
            </Link>{' '}
            goes live.
          </>
        }
        back={{ href: `/owner/listings/${listing._id}/edit`, label: 'Back to listing' }}
      />
      <PaymentSubmission
        listing={listing}
        payment={payment ? serialize(payment) : null}
        billing={serialize(billing)}
      />
    </>
  );
}
