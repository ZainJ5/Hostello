import {
  Building2,
  CalendarCheck,
  CircleCheck,
  Eye,
  Users,
  Wallet,
} from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import { getOverview } from '@/app/api/admin/_lib/analytics';
import PageHeader from '@/components/admin/PageHeader';
import NeedsAttention from '@/components/admin/overview/NeedsAttention';
import {
  ActivityFeed,
  TopListings,
  TrafficPanel,
} from '@/components/admin/overview/OverviewPanels';
import { formatCompact, serialize } from '@/lib/utils';

export const metadata = { title: 'Overview' };

export default async function AdminOverviewPage() {
  const session = await requireAdminPage();
  const { stats, series, queue, pendingListings, activity, top } = await getOverview();

  const urgent = stats.pendingPayments > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${(session.name || 'admin').split(' ')[0]}`}
        description="Everything happening across Hostello — listings, money, people and traffic."
        actions={
          <>
            <Button href="/admin/analytics" variant="secondary" size="sm">
              Detailed analytics
            </Button>
            <Button href="/admin/listings/new" size="sm">
              New listing
            </Button>
          </>
        }
      />

      {/* ── Stat tiles ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Total listings"
          value={stats.totalListings.toLocaleString('en-PK')}
          delta={stats.listingsDelta}
          icon={Building2}
          hint="vs previous 30 days"
        />
        <StatCard
          label="Published"
          value={stats.published.toLocaleString('en-PK')}
          icon={CircleCheck}
          hint={`${stats.pendingReview} in review · ${stats.pendingPaymentListings} awaiting payment`}
        />
        <StatCard
          label="Total users"
          value={stats.totalUsers.toLocaleString('en-PK')}
          delta={stats.usersDelta}
          icon={Users}
          hint={`${stats.students} students · ${stats.owners} owners · ${stats.admins} admins`}
        />
        <StatCard
          label="Bookings this month"
          value={stats.bookingsThisMonth.toLocaleString('en-PK')}
          delta={stats.bookingsDelta}
          icon={CalendarCheck}
          hint="vs last month"
        />
        <StatCard
          label="Pending payments"
          value={stats.pendingPayments.toLocaleString('en-PK')}
          delta={stats.pendingPaymentsDelta}
          icon={Wallet}
          hint={urgent ? 'Owners are waiting on you' : 'Queue is clear'}
          className={
            urgent
              ? 'border-danger/45 bg-danger-soft/45 shadow-sm ring-1 ring-danger/20 dark:bg-danger/10'
              : undefined
          }
        />
        <StatCard
          label="Views · last 30 days"
          value={formatCompact(stats.views30)}
          delta={stats.viewsDelta}
          icon={Eye}
          hint="vs previous 30 days"
        />
      </div>

      {/* ── Queue + traffic ── */}
      <div className="grid gap-3 xl:grid-cols-2">
        <NeedsAttention
          payments={serialize(queue)}
          listings={serialize(pendingListings)}
        />
        <TrafficPanel series={series} />
      </div>

      {/* ── Activity + leaderboard ── */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <ActivityFeed items={serialize(activity)} />
        <TopListings rows={serialize(top)} />
      </div>
    </div>
  );
}
