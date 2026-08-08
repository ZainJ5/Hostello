import { requireAdminPage } from '@/app/api/admin/_lib/guard';
import { getAnalytics, normalizeRange } from '@/app/api/admin/_lib/analytics';
import PageHeader from '@/components/admin/PageHeader';
import AnalyticsDashboard from '@/components/admin/analytics/AnalyticsDashboard';
import { serialize } from '@/lib/utils';

export const metadata = { title: 'Analytics' };

export default async function AdminAnalyticsPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;

  // Server-rendered first paint; the range picker refetches from
  // /api/admin/analytics so the charts keep their mounted state.
  const data = await getAnalytics(normalizeRange(sp.range));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Insight"
        title="Analytics"
        description="Traffic, conversion and inventory across the whole marketplace — every series aggregated live from PageView, Booking, Review, User and Hostel."
      />

      <AnalyticsDashboard initial={serialize(data)} />
    </div>
  );
}
