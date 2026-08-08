'use client';

import { useState } from 'react';
import { ChartColumn, Table as TableIcon } from 'lucide-react';
import Card from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

/**
 * Every chart on this console is wrapped in this frame, so all of them get the
 * same three guarantees: a legend that never relies on colour alone (each
 * swatch carries its own line pattern), an empty state, and a table view —
 * the WCAG-clean twin of the plot for anyone who cannot read the marks.
 */
export default function ChartCard({
  title,
  description,
  action,
  legend,
  table,
  empty,
  emptyTitle = 'No data for this period',
  emptyDescription = 'Once the platform records activity in this window the chart fills in.',
  emptyIcon = ChartColumn,
  height = 260,
  footnote,
  className,
  children,
}) {
  const [asTable, setAsTable] = useState(false);
  const showTable = Boolean(table) && asTable;

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
          {table && !empty && (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              aria-pressed={asTable}
              title={asTable ? 'Show the chart' : 'Show the numbers as a table'}
              className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {asTable ? (
                <ChartColumn className="size-4" aria-hidden="true" />
              ) : (
                <TableIcon className="size-4" aria-hidden="true" />
              )}
              <span className="sr-only">
                {asTable ? 'Show the chart' : 'Show the numbers as a table'}
              </span>
            </button>
          )}
        </div>
      </div>

      {legend && legend.length > 1 && !empty && !showTable && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pb-1.5">
          {legend.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                aria-hidden="true"
                className="inline-block h-0 w-5 shrink-0 rounded-full border-t-[3px]"
                style={{
                  borderColor: s.color,
                  borderTopStyle: s.dash === 'dashed' ? 'dashed' : s.dash === 'dotted' ? 'dotted' : 'solid',
                }}
              />
              <span className="text-foreground">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="min-w-0 flex-1 px-1.5 pb-3">
        {empty ? (
          <div className="px-2.5 pb-1 pt-1">
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              className="py-10"
            />
          </div>
        ) : showTable ? (
          <ChartTable table={table} height={height} />
        ) : (
          <div style={{ height }} className="min-w-0">
            {children}
          </div>
        )}
      </div>

      {footnote && !empty && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          {footnote}
        </p>
      )}
    </Card>
  );
}

function ChartTable({ table, height }) {
  return (
    <div className="overflow-auto px-2.5" style={{ maxHeight: height + 40 }}>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">{table.caption || 'Chart data'}</caption>
        <thead className="sticky top-0 z-10">
          <tr>
            {table.columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'sticky top-0 border-b border-border bg-surface px-2.5 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase',
                  c.align === 'right' && 'text-right'
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={row.key ?? i} className="transition-colors duration-150 hover:bg-muted/60">
              {table.columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'border-b border-border px-2.5 py-1.5 text-foreground',
                    c.align === 'right' && 'tabular text-right'
                  )}
                >
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
