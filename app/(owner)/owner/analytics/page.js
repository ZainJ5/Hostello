import Link from 'next/link';
import { BarChart3, Bookmark, Eye, MousePointerClick, Percent } from 'lucide-react';
import Card, { CardHeader, StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { cn, formatCompact, serialize } from '@/lib/utils';
import PageHeader from '@/components/owner/PageHeader';
import AnalyticsCharts from '@/components/owner/AnalyticsCharts';
import { getOwnerContext, getOwnerAnalytics } from '../../_lib/owner-data';

export const metadata = { title: 'Analytics' };

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

export default async function OwnerAnalyticsPage({ searchParams }) {
  const sp = await searchParams;
  const requested = Number(sp?.range);
  // PageView rows have a 90-day TTL, so 90 is the hard ceiling; anything
  // longer would silently chart a partial window.
  const range = RANGES.some((r) => r.value === requested) ? requested : 30;

  const { ownerId } = await getOwnerContext(sp?.ownerId);
  const data = serialize(await getOwnerAnalytics(ownerId, range));

  if (!data.hasListings) {
    return (
      <>
        <PageHeader title="Analytics" description="Traffic and conversion across your listings." />
        <EmptyState
          icon={BarChart3}
          title="No listings to analyse yet"
          description="Once you have a listing live, this page shows where your visitors come from and how many of them turn into booking requests."
          action={
            <Button href="/owner/listings/new" variant="accent">
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
        title="Analytics"
        description={`${data.listingCount} listing${
          data.listingCount === 1 ? '' : 's'
        } · every figure below is counted from your own listings' traffic.`}
        action={
          <nav
            className="inline-flex rounded-xl border border-border bg-surface p-1"
            aria-label="Date range"
          >
            {RANGES.map((option) => {
              const active = option.value === range;
              return (
                <Link
                  key={option.value}
                  href={`/owner/analytics?range=${option.value}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm font-medium',
                    'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    active
                      ? 'bg-brand-700 text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Views"
          value={formatCompact(data.totals.views)}
          delta={data.totals.viewsDelta}
          icon={Eye}
          hint={`vs previous ${range} days`}
        />
        <StatCard
          label="Contact clicks"
          value={formatCompact(data.totals.contacts)}
          delta={data.totals.contactsDelta}
          icon={MousePointerClick}
          hint="phone & WhatsApp taps"
        />
        <StatCard
          label="Saves"
          value={formatCompact(data.totals.saves)}
          delta={data.totals.savesDelta}
          icon={Bookmark}
          hint="added to a shortlist"
        />
        <StatCard
          label="View → contact"
          value={`${data.totals.conversion}%`}
          icon={Percent}
          hint={`${data.totals.bookings} booking request${
            data.totals.bookings === 1 ? '' : 's'
          } in this period`}
        />
      </div>

      <AnalyticsCharts data={data} />

      <Card className="mt-4">
        <CardHeader
          title="Per-listing breakdown"
          description={`Every listing you own, over the last ${range} days.`}
        />
        <div className="p-5 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">
                Views, contacts, saves and conversion rate per listing
              </caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="pr-3 pb-2.5 font-medium text-muted-foreground">Listing</th>
                  <th scope="col" className="px-3 pb-2.5 font-medium text-muted-foreground">Status</th>
                  <th scope="col" className="px-3 pb-2.5 text-right font-medium text-muted-foreground">Views</th>
                  <th scope="col" className="px-3 pb-2.5 text-right font-medium text-muted-foreground">Contacts</th>
                  <th scope="col" className="px-3 pb-2.5 text-right font-medium text-muted-foreground">Saves</th>
                  <th scope="col" className="pl-3 pb-2.5 text-right font-medium text-muted-foreground">
                    View → contact
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.comparison.map((row) => (
                  <tr key={row._id} className="transition-colors duration-200 hover:bg-muted/50">
                    <th scope="row" className="max-w-[280px] py-3 pr-3 text-left font-medium">
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
                    <td className="tabular py-3 pl-3 text-right text-foreground">
                      {row.views ? `${row.conversion}%` : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </>
  );
}
