'use client';

import Link from 'next/link';
import {
  Activity,
  ChartColumn,
  ExternalLink,
  MousePointerClick,
  TrendingUp,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge, { StatusBadge } from '@/components/ui/Badge';
import { EmptyState, Rating } from '@/components/ui/Feedback';
import Button from '@/components/ui/Button';
import ChartCard from '@/components/admin/charts/ChartCard';
import { TrafficArea } from '@/components/admin/charts/Charts';
import { Table, TableWrap, TBody, Td, Th, THead, Tr, Stacked } from '@/components/admin/Table';
import { actionLabel, actionTone } from '@/components/admin/labels';
import { shortDay } from '@/components/admin/client';
import { cn, formatCompact, timeAgo } from '@/lib/utils';

/** 30-day traffic, with the same numbers reachable as a table. */
export function TrafficPanel({ series }) {
  const empty = !series?.some((d) => d.views > 0);
  const total = series?.reduce((a, d) => a + d.views, 0) || 0;

  return (
    <ChartCard
      title="Traffic — last 30 days"
      description={`${total.toLocaleString('en-PK')} listing views recorded across the platform`}
      height={260}
      empty={empty}
      emptyTitle="No views recorded yet"
      emptyDescription="PageView rows appear here as soon as students start browsing listings."
      table={{
        caption: 'Daily listing views over the last 30 days',
        columns: [
          { key: 'day', label: 'Date' },
          { key: 'views', label: 'Views', align: 'right' },
          { key: 'contacts', label: 'Contacts', align: 'right' },
          { key: 'saves', label: 'Saves', align: 'right' },
        ],
        rows: (series || []).map((d) => ({
          key: d.date,
          day: shortDay(d.date),
          views: d.views.toLocaleString('en-PK'),
          contacts: d.contacts.toLocaleString('en-PK'),
          saves: d.saves.toLocaleString('en-PK'),
        })),
      }}
      action={
        <Button href="/admin/analytics" variant="ghost" size="sm">
          Full analytics
          <ChartColumn className="size-3.5" aria-hidden="true" />
        </Button>
      }
    >
      <TrafficArea data={series} dataKey="views" name="Views" yLabel="Views" />
    </ChartCard>
  );
}

const TONE_DOT = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  neutral: 'bg-border-strong',
};

export function ActivityFeed({ items }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Admin actions, signups and booking requests.
          </p>
        </div>
        <Button href="/admin/audit" variant="ghost" size="sm">
          Audit log
        </Button>
      </div>

      {!items?.length ? (
        <div className="p-4">
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Approvals, signups and booking requests will stream in here."
            action={
              <Button href="/admin/listings" variant="secondary" size="sm">
                Review listings
              </Button>
            }
            className="py-10"
          />
        </div>
      ) : (
        <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
          {items.map((item) => {
            const tone = actionTone(item.action);
            return (
              <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <span
                  aria-hidden="true"
                  className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_DOT[tone])}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{actionLabel(item.action)}</span>
                    {item.target ? (
                      <span className="text-muted-foreground"> · {item.target}</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.actor}
                    {item.meta?.status ? ` · ${item.meta.status}` : ''}
                  </p>
                </div>
                <time
                  className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
                  dateTime={new Date(item.at).toISOString()}
                >
                  {timeAgo(item.at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function TopListings({ rows }) {
  if (!rows?.length) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={TrendingUp}
          title="No engagement in the last 30 days"
          description="Views, contact clicks and saves will rank listings here."
          action={
            <Button href="/admin/listings" variant="secondary" size="sm">
              Go to listings
            </Button>
          }
          className="py-10"
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Top performing listings</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ranked by views in the last 30 days. Conversion is contact clicks ÷ views.
          </p>
        </div>
        <Button href="/admin/analytics" variant="ghost" size="sm">
          See all
        </Button>
      </div>

      <TableWrap className="rounded-none border-0" maxHeight="max-h-[24rem]">
        <Table minWidth="min-w-[46rem]">
          <THead>
            <tr>
              <Th>Listing</Th>
              <Th align="right">Views</Th>
              <Th align="right">Contacts</Th>
              <Th align="right">Saves</Th>
              <Th align="right">Bookings</Th>
              <Th align="right">Conversion</Th>
              <Th align="right">Rating</Th>
              <Th width="4rem">
                <span className="sr-only">Open</span>
              </Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r._id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Stacked primary={r.name} secondary={r.city} />
                    <StatusBadge status={r.status} size="sm" />
                  </div>
                </Td>
                <Td align="right" className="tabular">
                  {formatCompact(r.views)}
                </Td>
                <Td align="right" className="tabular">
                  {formatCompact(r.contacts)}
                </Td>
                <Td align="right" className="tabular">
                  {formatCompact(r.saves)}
                </Td>
                <Td align="right" className="tabular">
                  {r.bookings}
                </Td>
                <Td align="right">
                  <Badge
                    tone={r.conversion >= 20 ? 'success' : r.conversion >= 10 ? 'brand' : 'neutral'}
                    size="sm"
                    className="tabular"
                  >
                    <MousePointerClick className="size-3" aria-hidden="true" />
                    {r.conversion}%
                  </Badge>
                </Td>
                <Td align="right">
                  <Rating value={r.rating} size="sm" showValue count={r.reviewCount} />
                </Td>
                <Td align="right">
                  <Link
                    href={`/admin/listings/${r._id}/edit`}
                    aria-label={`Edit ${r.name}`}
                    className="inline-grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </TableWrap>
    </Card>
  );
}
