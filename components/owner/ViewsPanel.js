'use client';

import { useMemo } from 'react';
import { ChartFrame, TrafficChart } from './charts';

/**
 * Dashboard traffic panel. Wraps the shared chart so the dashboard page can
 * stay a Server Component and only this island ships to the browser.
 */
export default function ViewsPanel({ series }) {
  const totals = useMemo(
    () =>
      series.reduce(
        (acc, row) => ({
          views: acc.views + row.views,
          contacts: acc.contacts + row.contacts,
          saves: acc.saves + row.saves,
        }),
        { views: 0, contacts: 0, saves: 0 }
      ),
    [series]
  );

  const best = useMemo(
    () => series.reduce((top, row) => (row.views > (top?.views ?? -1) ? row : top), null),
    [series]
  );

  return (
    <ChartFrame
      title="Traffic, last 30 days"
      description={
        totals.views
          ? `${totals.views.toLocaleString('en-PK')} views, ${totals.contacts.toLocaleString(
              'en-PK'
            )} contact clicks and ${totals.saves.toLocaleString('en-PK')} saves${
              best?.views ? ` · busiest day ${best.views} views` : ''
            }`
          : 'No visits recorded in the last 30 days.'
      }
      summary={`Daily views, contact clicks and saves across your listings for the last 30 days. Total ${totals.views} views, ${totals.contacts} contacts, ${totals.saves} saves.`}
      height={300}
    >
      <TrafficChart data={series} height={300} />
    </ChartFrame>
  );
}
