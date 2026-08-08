'use client';

import { useCallback, useState } from 'react';
import { Bookmark, Building2, Eye, Funnel, MousePointerClick, Star, Users } from 'lucide-react';
import Card, { StatCard } from '@/components/ui/Card';
import ChartCard from '@/components/admin/charts/ChartCard';
import {
  CategoryBars,
  Donut,
  FunnelBars,
  Histogram,
  MultiLine,
  OrdinalBars,
  SLOT,
  StackedBars,
} from '@/components/admin/charts/Charts';
import { RangePicker } from '@/components/admin/Filters';
import { useToast } from '@/components/admin/ToastProvider';
import { apiGet, shortDay } from '@/components/admin/client';
import { cn, formatCompact, formatPKR } from '@/lib/utils';

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const ENGAGEMENT = [
  { key: 'views', name: 'Views' },
  { key: 'contacts', name: 'Contact clicks' },
  { key: 'saves', name: 'Saves' },
];

const ROLE_SERIES = [
  { key: 'student', name: 'Students' },
  { key: 'owner', name: 'Owners' },
  { key: 'admin', name: 'Admins' },
];

function truncate(s, n = 22) {
  const str = String(s || '');
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

const num = (n) => Number(n || 0).toLocaleString('en-PK');

export default function AnalyticsDashboard({ initial }) {
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [range, setRange] = useState(initial.days);
  const [loading, setLoading] = useState(false);

  const changeRange = useCallback(
    async (value) => {
      if (value === range) return;
      setRange(value);
      setLoading(true);
      const res = await apiGet(`/api/admin/analytics?range=${value}`);
      setLoading(false);
      if (!res.ok) {
        setRange(data.days);
        return toast({ tone: 'danger', title: 'Could not load that range', description: res.error });
      }
      setData(res.data);
    },
    [range, data.days, toast]
  );

  const { totals, series, funnel, byCity, byUniversity, byGender, byPrice, ratings, newUsers } =
    data;

  const conversion = totals.views ? Math.round((totals.contacts / totals.views) * 1000) / 10 : 0;
  const noTraffic = !series.some((d) => d.views || d.contacts || d.saves);
  const noSignups = !newUsers.some((d) => d.student || d.owner || d.admin);
  const genderTotal = byGender.reduce((a, d) => a + d.count, 0);

  const topViews = data.topByViews.map((r) => ({
    label: truncate(r.name),
    full: r.name,
    count: r.views,
    city: r.city,
  }));
  const topBookings = data.topByBookings.map((r) => ({
    label: truncate(r.name),
    full: r.name,
    count: r.bookings,
    city: r.city,
  }));

  return (
    <div className="space-y-4">
      {/* One filter row, above everything it scopes. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Reporting window</p>
          <p className="text-xs text-muted-foreground">
            Every chart below is scoped to this range. PageView rows are kept for 90 days.
          </p>
        </div>
        <RangePicker value={range} onChange={changeRange} options={RANGES} pending={loading} />
      </div>

      <div className={cn('space-y-4 transition-opacity duration-200', loading && 'opacity-55')}>
        {/* ── Headline numbers ── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={`Views · ${range}d`} value={formatCompact(totals.views)} icon={Eye} />
          <StatCard
            label={`Contact clicks · ${range}d`}
            value={formatCompact(totals.contacts)}
            icon={MousePointerClick}
          />
          <StatCard label={`Saves · ${range}d`} value={formatCompact(totals.saves)} icon={Bookmark} />
          <StatCard
            label="View → contact rate"
            value={`${conversion}%`}
            icon={Funnel}
            hint="Contact clicks divided by views"
          />
        </div>

        {/* ── Engagement over time ── */}
        <ChartCard
          title="Engagement over time"
          description="Views, contact clicks and saves per day. Each series has its own line pattern as well as its own colour."
          height={300}
          empty={noTraffic}
          legend={[
            { label: 'Views', color: SLOT[0], dash: 'solid' },
            { label: 'Contact clicks', color: SLOT[1], dash: 'dashed' },
            { label: 'Saves', color: SLOT[2], dash: 'dotted' },
          ]}
          table={{
            caption: 'Daily engagement',
            columns: [
              { key: 'day', label: 'Date' },
              { key: 'views', label: 'Views', align: 'right' },
              { key: 'contacts', label: 'Contacts', align: 'right' },
              { key: 'saves', label: 'Saves', align: 'right' },
            ],
            rows: series.map((d) => ({
              key: d.date,
              day: shortDay(d.date),
              views: num(d.views),
              contacts: num(d.contacts),
              saves: num(d.saves),
            })),
          }}
        >
          <MultiLine data={series} series={ENGAGEMENT} yLabel="Events per day" />
        </ChartCard>

        {/* ── Funnel ── */}
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <ChartCard
            title="Bookings funnel"
            description="Ordered stages, so the bars take a single-hue ramp rather than eight colours."
            height={250}
            empty={!funnel[0].value}
            table={{
              caption: 'Funnel stages and conversion',
              columns: [
                { key: 'stage', label: 'Stage' },
                { key: 'value', label: 'Count', align: 'right' },
                { key: 'step', label: 'From previous', align: 'right' },
                { key: 'overall', label: 'From views', align: 'right' },
              ],
              rows: funnel.map((f) => ({
                key: f.stage,
                stage: f.stage,
                value: num(f.value),
                step: `${f.stepRate}%`,
                overall: `${f.overallRate}%`,
              })),
            }}
          >
            <FunnelBars data={funnel} />
          </ChartCard>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Conversion rates</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Each step against the one before it, and against total views.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {funnel.map((f, i) => (
                <li key={f.stage} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className="tabular grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{f.stage}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {num(f.value)} in the last {range} days
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold text-foreground">
                      {i === 0 ? '—' : `${f.stepRate}%`}
                    </p>
                    <p className="tabular text-xs text-muted-foreground">{f.overallRate}% of views</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* ── Composition ── */}
        <div className="grid gap-3 xl:grid-cols-2">
          <ChartCard
            title="Listings by city"
            description={`Where the ${num(data.totalListings)} listings on the platform are.`}
            height={280}
            empty={!byCity.length}
            emptyIcon={Building2}
            table={{
              caption: 'Listings per city',
              columns: [
                { key: 'label', label: 'City' },
                { key: 'count', label: 'Listings', align: 'right' },
              ],
              rows: byCity.map((c) => ({ key: c.label, label: c.label, count: num(c.count) })),
            }}
          >
            <CategoryBars data={byCity} xLabel="Listings" categoryWidth={96} />
          </ChartCard>

          <ChartCard
            title="Listings by university"
            description="Top 10 campuses by how many hostels list them as nearby."
            height={280}
            empty={!byUniversity.length}
            emptyIcon={Building2}
            table={{
              caption: 'Listings per university',
              columns: [
                { key: 'label', label: 'University' },
                { key: 'count', label: 'Listings', align: 'right' },
              ],
              rows: byUniversity.map((c) => ({ key: c.label, label: c.label, count: num(c.count) })),
            }}
          >
            <CategoryBars data={byUniversity} xLabel="Listings" categoryWidth={120} />
          </ChartCard>

          <ChartCard
            title="Listings by gender"
            description="Three segments, labelled outside the ring so no colour has to be decoded."
            height={260}
            empty={!genderTotal}
            legend={byGender.map((g, i) => ({ label: g.label, color: SLOT[i % SLOT.length] }))}
            table={{
              caption: 'Listings per gender',
              columns: [
                { key: 'label', label: 'Gender' },
                { key: 'count', label: 'Listings', align: 'right' },
                { key: 'share', label: 'Share', align: 'right' },
              ],
              rows: byGender.map((g) => ({
                key: g.label,
                label: g.label,
                count: num(g.count),
                share: `${Math.round((g.count / (genderTotal || 1)) * 100)}%`,
              })),
            }}
          >
            <Donut data={byGender} total={genderTotal} />
          </ChartCard>

          <ChartCard
            title="Price distribution"
            description="Monthly rent bands across every listing."
            height={260}
            empty={!byPrice.some((b) => b.count)}
            footnote={`Rents range from ${formatPKR(5000)} to ${formatPKR(35000)} across the marketplace.`}
            table={{
              caption: 'Listings per rent band',
              columns: [
                { key: 'label', label: 'Band' },
                { key: 'count', label: 'Listings', align: 'right' },
              ],
              rows: byPrice.map((b) => ({ key: b.label, label: b.label, count: num(b.count) })),
            }}
          >
            <Histogram data={byPrice} xLabel="Monthly rent (PKR)" yLabel="Listings" />
          </ChartCard>
        </div>

        {/* ── Leaderboards ── */}
        <div className="grid gap-3 xl:grid-cols-2">
          <ChartCard
            title="Top 10 listings by views"
            description={`Most viewed hostels in the last ${range} days.`}
            height={300}
            empty={!topViews.length}
            table={{
              caption: 'Top listings by views',
              columns: [
                { key: 'full', label: 'Listing' },
                { key: 'city', label: 'City' },
                { key: 'count', label: 'Views', align: 'right' },
              ],
              rows: topViews.map((r) => ({ ...r, key: r.full, count: num(r.count) })),
            }}
          >
            <CategoryBars data={topViews} xLabel="Views" categoryWidth={150} />
          </ChartCard>

          <ChartCard
            title="Top 10 listings by bookings"
            description={`Most requested hostels in the last ${range} days.`}
            height={300}
            empty={!topBookings.length}
            emptyTitle="No bookings in this window"
            emptyDescription="Try a longer range — booking requests are less frequent than views."
            table={{
              caption: 'Top listings by bookings',
              columns: [
                { key: 'full', label: 'Listing' },
                { key: 'city', label: 'City' },
                { key: 'count', label: 'Bookings', align: 'right' },
              ],
              rows: topBookings.map((r) => ({ ...r, key: r.full, count: num(r.count) })),
            }}
          >
            <CategoryBars data={topBookings} xLabel="Bookings" categoryWidth={150} />
          </ChartCard>
        </div>

        {/* ── People and sentiment ── */}
        <div className="grid gap-3 xl:grid-cols-2">
          <ChartCard
            title="New accounts over time"
            description="Signups per day, stacked by role."
            height={280}
            empty={noSignups}
            emptyIcon={Users}
            emptyTitle="No signups in this window"
            emptyDescription="Try a longer range, or check that registration is reachable."
            legend={ROLE_SERIES.map((r, i) => ({ label: r.name, color: SLOT[i % SLOT.length] }))}
            table={{
              caption: 'New accounts per day by role',
              columns: [
                { key: 'day', label: 'Date' },
                { key: 'student', label: 'Students', align: 'right' },
                { key: 'owner', label: 'Owners', align: 'right' },
                { key: 'admin', label: 'Admins', align: 'right' },
              ],
              rows: newUsers.map((d) => ({
                key: d.date,
                day: shortDay(d.date),
                student: num(d.student),
                owner: num(d.owner),
                admin: num(d.admin),
              })),
            }}
          >
            <StackedBars data={newUsers} series={ROLE_SERIES} yLabel="New accounts" />
          </ChartCard>

          <ChartCard
            title="Review rating distribution"
            description="Every visible review, by star rating. Ordered categories take the single-hue ramp."
            height={280}
            empty={!ratings.some((r) => r.count)}
            emptyIcon={Star}
            table={{
              caption: 'Reviews per rating',
              columns: [
                { key: 'label', label: 'Rating' },
                { key: 'count', label: 'Reviews', align: 'right' },
              ],
              rows: ratings.map((r) => ({ key: r.label, label: r.label, count: num(r.count) })),
            }}
          >
            <OrdinalBars data={ratings} xLabel="Reviews" />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
