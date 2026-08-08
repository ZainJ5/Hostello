'use client';

import { useState } from 'react';
import {
  BookingStatusChart,
  ChartFrame,
  ConversionFunnel,
  ListingComparisonChart,
  RatingTrendChart,
  ReferrerChart,
  TrafficChart,
} from './charts';
import { cn } from '@/lib/utils';

const SERIES_TOGGLES = [
  { key: 'views', label: 'Views' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'saves', label: 'Saves' },
];

function SeriesToggle({ active, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show or hide series">
      {SERIES_TOGGLES.map((series) => {
        const on = active.includes(series.key);
        return (
          <button
            key={series.key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(series.key)}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center rounded-lg border px-2.5 text-xs font-medium',
              'transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              on
                ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground'
            )}
          >
            {series.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Every series here is a real aggregation of this owner's own `PageView`,
 * `Booking` and `Review` rows — nothing is sampled, estimated or padded.
 */
export default function AnalyticsCharts({ data }) {
  const [series, setSeries] = useState(['views', 'contacts', 'saves']);

  function toggle(key) {
    setSeries((current) =>
      current.includes(key)
        ? current.length > 1
          ? current.filter((k) => k !== key)
          : current
        : [...current, key]
    );
  }

  const rangeLabel = `last ${data.range} days`;

  return (
    <div className="space-y-4">
      <ChartFrame
        title="Traffic over time"
        description={`Views, contact clicks and saves across your listings — ${rangeLabel}.`}
        summary={`Daily traffic for the ${rangeLabel}: ${data.totals.views} views, ${data.totals.contacts} contact clicks, ${data.totals.saves} saves.`}
        action={<SeriesToggle active={series} onToggle={toggle} />}
        height={320}
      >
        <TrafficChart data={data.series} series={series} height={320} />
      </ChartFrame>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFrame
          title="Listing comparison"
          description={`Your busiest listings — ${rangeLabel}.`}
          summary={`Views, contacts and saves per listing for the ${rangeLabel}.`}
          empty={!data.comparison.length}
          emptyLabel="Add a listing and its traffic appears here."
          height={340}
        >
          <ListingComparisonChart data={data.comparison} height={340} />
        </ChartFrame>

        <ChartFrame
          title="Conversion funnel"
          description="How many people who saw a listing went on to enquire and be confirmed."
          summary={data.funnel
            .map((step) => `${step.stage}: ${step.value}`)
            .join(', ')}
          height={340}
        >
          <div className="px-3 py-4">
            <ConversionFunnel data={data.funnel} />
          </div>
        </ChartFrame>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartFrame
          title="Where your visitors come from"
          description={`Referrer of every listing view — ${rangeLabel}.`}
          summary={data.referrers.map((r) => `${r.source}: ${r.value}`).join(', ') || 'No data'}
          height={260}
        >
          <div className="px-3 py-2">
            <ReferrerChart data={data.referrers} height={230} />
          </div>
        </ChartFrame>

        <ChartFrame
          title="Booking requests by outcome"
          description={`What happened to the requests you received — ${rangeLabel}.`}
          summary={data.bookingBreakdown.map((b) => `${b.status}: ${b.value}`).join(', ')}
          height={260}
        >
          <BookingStatusChart data={data.bookingBreakdown} height={260} />
        </ChartFrame>
      </div>

      <ChartFrame
        title="Rating trend"
        description="Your running average across every published review, day by day."
        summary="Average rating over time across all your listings."
        height={280}
      >
        <RatingTrendChart data={data.ratingTrend} height={280} />
      </ChartFrame>
    </div>
  );
}
