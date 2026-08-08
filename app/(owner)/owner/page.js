import Link from 'next/link';
import {
  Bookmark,
  Building2,
  Eye,
  MessageSquare,
  MousePointerClick,
  Plus,
  Star,
} from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, Rating } from '@/components/ui/Feedback';
import { formatCompact, serialize, timeAgo } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import ActionNeeded from '@/components/owner/ActionNeeded';
import RecentBookings from '@/components/owner/RecentBookings';
import ViewsPanel from '@/components/owner/ViewsPanel';
import { getOwnerContext, getDashboard } from '../_lib/owner-data';

export const metadata = { title: 'Dashboard' };

export default async function OwnerDashboardPage({ searchParams }) {
  const sp = await searchParams;
  // `requireRole('owner','admin')` runs inside getOwnerContext, on every page.
  const { ownerId, isAdmin } = await getOwnerContext(sp?.ownerId);
  const dashboard = serialize(await getDashboard(ownerId));
  const { stats } = dashboard;

  if (stats.listings === 0) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Your listings, traffic and booking requests in one place."
        />
        <EmptyState
          icon={Building2}
          title="You have not listed a hostel yet"
          description="Add your first hostel, transfer the listing fee, and it goes live as soon as an admin approves your payment."
          action={
            <Button href="/owner/listings/new" variant="accent" size="lg">
              <Plus className="size-5" aria-hidden="true" />
              Add your first hostel
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Last 30 days${isAdmin ? ' · viewing as admin' : ''}`}
        action={
          <>
            <Button href="/owner/analytics" variant="secondary">
              Full analytics
            </Button>
            <Button href="/owner/listings/new" variant="accent">
              <Plus className="size-4.5" aria-hidden="true" />
              Add new hostel
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Listings"
          value={stats.listings}
          icon={Building2}
          hint={`${stats.published} live · ${stats.pending} pending`}
        />
        <StatCard
          label="Views"
          value={formatCompact(stats.views)}
          delta={stats.viewsDelta}
          icon={Eye}
          hint="vs previous 30 days"
        />
        <StatCard
          label="Contact clicks"
          value={formatCompact(stats.contacts)}
          delta={stats.contactsDelta}
          icon={MousePointerClick}
          hint="phone & WhatsApp taps"
        />
        <StatCard
          label="Booking requests"
          value={stats.bookings}
          delta={stats.bookingsDelta}
          icon={MessageSquare}
          hint={
            stats.pendingBookings > 0 ? (
              <Link
                href="/owner/bookings?status=pending"
                className="inline-flex items-center gap-1 rounded-md bg-accent-100 px-1.5 py-0.5 font-semibold text-accent-700 underline-offset-2 hover:underline dark:bg-accent-700/20 dark:text-accent-300"
              >
                <span className="tabular">{stats.pendingBookings}</span> awaiting your reply
              </Link>
            ) : (
              'all answered'
            )
          }
        />
        <StatCard
          label="Average rating"
          value={stats.rating ? stats.rating.toFixed(1) : '—'}
          delta={stats.ratingDelta ?? undefined}
          icon={Star}
          hint={`across ${stats.ratingCount} review${stats.ratingCount === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Saves"
          value={formatCompact(stats.saves)}
          delta={stats.savesDelta}
          icon={Bookmark}
          hint="students who shortlisted you"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ViewsPanel series={dashboard.series} />
        </div>
        <ActionNeeded dashboard={dashboard} />
      </div>

      <div className="mt-4">
        <PerformanceTable rows={dashboard.performance} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentBookings bookings={dashboard.recentBookings} />
        <UnrepliedReviews reviews={dashboard.unrepliedReviews} />
      </div>
    </>
  );
}

// An owner with a large portfolio (the demo account has 64) would otherwise
// turn the dashboard into an endless scroll. Show the busiest few and send
// the rest to the analytics page, which is built for comparison.
const PERFORMANCE_PREVIEW = 8;

function PerformanceTable({ rows }) {
  const shown = rows.slice(0, PERFORMANCE_PREVIEW);
  const hidden = rows.length - shown.length;

  return (
    <Card>
      <CardHeader
        title="Listing performance"
        description={
          hidden > 0
            ? `Your ${PERFORMANCE_PREVIEW} busiest listings over the last 30 days.`
            : 'Last 30 days, busiest listing first.'
        }
        action={
          <Button href="/owner/analytics" variant="ghost" size="sm">
            Compare listings
          </Button>
        }
      />
      <div className="p-5 pt-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No listings to measure"
            description="Add a hostel and its traffic shows up here."
            action={
              <Button href="/owner/listings/new" variant="accent" size="sm">
                Add a hostel
              </Button>
            }
            className="py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">
                Views, contacts, saves, bookings and rating per listing over the last 30 days
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="pb-2.5 pr-3 font-medium text-muted-foreground">
                    Listing
                  </th>
                  <th scope="col" className="pb-2.5 px-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th scope="col" className="pb-2.5 px-3 text-right font-medium text-muted-foreground">
                    Views
                  </th>
                  <th scope="col" className="pb-2.5 px-3 text-right font-medium text-muted-foreground">
                    Contacts
                  </th>
                  <th scope="col" className="pb-2.5 px-3 text-right font-medium text-muted-foreground">
                    Saves
                  </th>
                  <th scope="col" className="pb-2.5 px-3 text-right font-medium text-muted-foreground">
                    Bookings
                  </th>
                  <th scope="col" className="pb-2.5 pl-3 text-right font-medium text-muted-foreground">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((row) => (
                  <tr key={row._id} className="transition-colors duration-200 hover:bg-muted/50">
                    <th scope="row" className="max-w-[260px] py-3 pr-3 text-left font-medium">
                      <Link
                        href={`/owner/listings/${row._id}/edit`}
                        className="block truncate text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {row.name}
                      </Link>
                    </th>
                    <td className="px-3 py-3">
                      <StatusBadge status={row.status} size="sm" />
                    </td>
                    <td className="tabular px-3 py-3 text-right text-foreground">
                      {row.views.toLocaleString('en-PK')}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-foreground">
                      {row.contacts.toLocaleString('en-PK')}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-foreground">
                      {row.saves.toLocaleString('en-PK')}
                    </td>
                    <td className="tabular px-3 py-3 text-right text-foreground">{row.bookings}</td>
                    <td className="py-3 pl-3 text-right">
                      {row.reviewCount ? (
                        <span className="tabular font-medium text-foreground">
                          {row.rating.toFixed(1)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({row.reviewCount})
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No reviews</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hidden > 0 && (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                {hidden} more {hidden === 1 ? 'listing' : 'listings'} not shown.{' '}
                <Link
                  href="/owner/analytics"
                  className="font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
                >
                  Compare all in analytics
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function UnrepliedReviews({ reviews }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Reviews waiting for a reply"
        description="Replying publicly is the cheapest trust you can buy."
        action={
          <Button href="/owner/reviews" variant="ghost" size="sm">
            All reviews
          </Button>
        }
      />
      <div className="flex-1 p-5 pt-4">
        {reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Every review has a reply"
            description="Nothing is waiting on you. New reviews will show up here."
            action={
              <Button href="/owner/reviews" variant="secondary" size="sm">
                Read your reviews
              </Button>
            }
            className="py-10"
          />
        ) : (
          <ul className="space-y-2.5">
            {reviews.map((review) => (
              <li key={review._id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {review.studentName || 'Anonymous'}
                  </p>
                  <Rating value={review.rating} size="sm" showValue={false} />
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {review.hostelName} · {timeAgo(review.createdAt)}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground text-pretty">
                  {review.comment}
                </p>
                <Button
                  href={`/owner/reviews?filter=unreplied#review-${review._id}`}
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                >
                  Write a reply
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
