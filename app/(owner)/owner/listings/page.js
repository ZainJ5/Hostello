import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { cn, serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import ListingCard from '@/components/owner/ListingCard';
import { LISTING_STATUS_ORDER } from '@/components/owner/constants';
import { getOwnerContext, getOwnerListings } from '../../_lib/owner-data';

export const metadata = { title: 'My listings' };

const TAB_LABELS = {
  all: 'All',
  draft: 'Drafts',
  pending_payment: 'Awaiting payment',
  pending_review: 'In review',
  published: 'Live',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export default async function OwnerListingsPage({ searchParams }) {
  const sp = await searchParams;
  const status = typeof sp?.status === 'string' ? sp.status : 'all';
  const { ownerId } = await getOwnerContext(sp?.ownerId);

  const data = serialize(await getOwnerListings(ownerId, { status }));
  const { listings, counts, total } = data;

  // Only show a tab for a state the owner actually has something in, plus the
  // one they are currently filtered to.
  const tabs = ['all', ...LISTING_STATUS_ORDER.filter((s) => counts[s] > 0 || s === status)];

  return (
    <>
      <PageHeader
        title="My listings"
        description={
          total === 0
            ? 'Everything you list on Hostello lives here.'
            : `${total} listing${total === 1 ? '' : 's'} · ${counts.published || 0} live`
        }
        action={
          <Button href="/owner/listings/new" variant="accent">
            <Plus className="size-4.5" aria-hidden="true" />
            Add new hostel
          </Button>
        }
      />

      {total > 0 && (
        <nav
          className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          aria-label="Filter listings by status"
        >
          {tabs.map((tab) => {
            const active = status === tab;
            const count = tab === 'all' ? total : counts[tab] || 0;
            return (
              <Link
                key={tab}
                href={tab === 'all' ? '/owner/listings' : `/owner/listings?status=${tab}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm font-medium',
                  'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  active
                    ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                    : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {TAB_LABELS[tab] || tab}
                <span
                  className={cn(
                    'tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    active ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {listings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={total === 0 ? 'No listings yet' : `Nothing in “${TAB_LABELS[status] || status}”`}
          description={
            total === 0
              ? 'Add your first hostel. You can save a draft at any point and finish it later — nothing is lost.'
              : 'Try another status filter, or add a new hostel.'
          }
          action={
            total === 0 ? (
              <Button href="/owner/listings/new" variant="accent" size="lg">
                <Plus className="size-5" aria-hidden="true" />
                Add your first hostel
              </Button>
            ) : (
              <Button href="/owner/listings" variant="secondary">
                Show all listings
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </>
  );
}
