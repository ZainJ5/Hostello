'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn, formatCompact } from '@/lib/utils';

/**
 * Charts read their colours out of the design tokens at runtime rather than
 * hardcoding hex values, so a theme switch (or a rebrand) is picked up without
 * touching this file. Before hydration the raw `var(--…)` strings are used,
 * which browsers resolve in SVG presentation attributes anyway — the effect
 * below just pins them to concrete values so gradients and fills stay stable.
 */
const TOKENS = {
  brand: '--color-brand-600',
  brandDeep: '--color-brand-800',
  accent: '--color-accent-500',
  info: '--color-info',
  success: '--color-success',
  danger: '--color-danger',
  warning: '--color-warning',
  neutral: '--muted-foreground',
  grid: '--border',
  axis: '--muted-foreground',
  surface: '--surface',
  foreground: '--foreground',
};

const FALLBACK = Object.fromEntries(
  Object.entries(TOKENS).map(([key, value]) => [key, `var(${value})`])
);

export function useChartTheme() {
  const [theme, setTheme] = useState(FALLBACK);

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const next = {};
      for (const [key, token] of Object.entries(TOKENS)) {
        next[key] = styles.getPropertyValue(token).trim() || FALLBACK[key];
      }
      setTheme(next);
    };
    read();

    // The `.dark` class lands on <html>; re-read when it flips.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function formatDayLabel(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Token-styled tooltip; the recharts default is a hardcoded white box. */
function ChartTooltip({ active, payload, label, labelFormatter, valueSuffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 shadow-lg">
      {label !== undefined && (
        <p className="mb-1 text-xs font-semibold text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: entry.color || entry.payload?.fill }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="tabular ml-auto font-semibold text-foreground">
              {typeof entry.value === 'number' ? entry.value.toLocaleString('en-PK') : entry.value}
              {valueSuffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function axisProps(theme) {
  return {
    stroke: theme.axis,
    tick: { fill: theme.axis, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  };
}

/** Shared chrome: title, description, an accessible summary and empty state. */
export function ChartFrame({ title, description, action, empty, emptyLabel, summary, children, height = 300 }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-2 sm:p-4">
        {empty ? (
          <div
            className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center"
            style={{ minHeight: height }}
          >
            <p className="text-sm font-medium text-foreground">Nothing to chart yet</p>
            <p className="max-w-xs text-sm text-muted-foreground text-pretty">
              {emptyLabel || 'Data appears here as students start finding your listings.'}
            </p>
          </div>
        ) : (
          <div role="img" aria-label={summary || title} style={{ width: '100%', height }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Traffic over time ──────────────────────────────────────────────────

const TRAFFIC_SERIES = [
  { key: 'views', label: 'Views', token: 'brand', dash: null },
  { key: 'contacts', label: 'Contact clicks', token: 'accent', dash: '6 3' },
  { key: 'saves', label: 'Saves', token: 'info', dash: '2 3' },
];

/**
 * Views / contacts / saves over time. Each series carries its own dash pattern
 * as well as its own colour, so the three lines stay distinguishable in
 * greyscale and for anyone with a colour vision deficiency.
 */
export function TrafficChart({ data, series = ['views', 'contacts', 'saves'], height = 300 }) {
  const theme = useChartTheme();
  const active = TRAFFIC_SERIES.filter((s) => series.includes(s.key));
  const total = useMemo(
    () => data.reduce((sum, row) => sum + active.reduce((n, s) => n + (row[s.key] || 0), 0), 0),
    [data, active]
  );

  if (!total) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-foreground">No traffic in this period</p>
        <p className="text-sm text-muted-foreground">Try a wider date range.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {active.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme[s.token]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={theme[s.token]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={28} {...axisProps(theme)} />
        <YAxis width={52} allowDecimals={false} tickFormatter={formatCompact} {...axisProps(theme)} />
        <Tooltip
          content={<ChartTooltip labelFormatter={formatDayLabel} />}
          cursor={{ stroke: theme.grid, strokeWidth: 1 }}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: theme.axis }}
        />
        {active.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={theme[s.token]}
            strokeWidth={2}
            strokeDasharray={s.dash || undefined}
            fill={`url(#fill-${s.key})`}
            activeDot={{ r: 4 }}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Per-listing comparison ─────────────────────────────────────────────

export function ListingComparisonChart({ data, height = 320 }) {
  const theme = useChartTheme();
  const rows = data.slice(0, 8).map((d) => ({
    ...d,
    short: d.name.length > 26 ? `${d.name.slice(0, 25)}…` : d.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickFormatter={formatCompact} {...axisProps(theme)} />
        <YAxis type="category" dataKey="short" width={140} {...axisProps(theme)} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.grid, fillOpacity: 0.35 }} />
        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12, color: theme.axis }} />
        <Bar dataKey="views" name="Views" fill={theme.brand} radius={[0, 4, 4, 0]} />
        <Bar dataKey="contacts" name="Contacts" fill={theme.accent} radius={[0, 4, 4, 0]} />
        <Bar dataKey="saves" name="Saves" fill={theme.info} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Conversion funnel ──────────────────────────────────────────────────

/**
 * Rendered as proportional bars rather than a recharts funnel: at these ratios
 * (views ≫ confirmed) a true funnel collapses to a sliver, and the drop-off
 * percentages are the part an owner actually acts on.
 */
export function ConversionFunnel({ data }) {
  const theme = useChartTheme();
  const top = data[0]?.value || 0;
  const colours = [theme.brand, theme.info, theme.accent, theme.success];

  if (!top) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No views in this period, so there is no funnel to draw yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3 p-1">
      {data.map((step, i) => {
        const width = top ? Math.max((step.value / top) * 100, step.value > 0 ? 4 : 0) : 0;
        return (
          <li key={step.stage}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">
                <span className="tabular mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
                {step.stage}
              </span>
              <span className="tabular text-sm font-semibold text-foreground">
                {step.value.toLocaleString('en-PK')}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {i === 0 ? '100% of views' : `${step.rate}% of views · ${step.stepRate}% of previous step`}
                </span>
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${width}%`, backgroundColor: colours[i % colours.length] }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Referrers ──────────────────────────────────────────────────────────

export function ReferrerChart({ data, height = 260 }) {
  const theme = useChartTheme();
  const palette = [theme.brand, theme.accent, theme.info, theme.success, theme.neutral];
  const total = data.reduce((n, d) => n + d.value, 0);

  if (!total) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No referrer data in this period.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div style={{ width: '100%', maxWidth: 240, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="source"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              stroke={theme.surface}
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={entry.source} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* The legend doubles as the data table — the segments are never the only
          way to read a value. */}
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {data.map((entry, i) => (
          <li key={entry.source} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-[4px]"
              style={{ backgroundColor: palette[i % palette.length] }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{entry.source}</span>
            <span className="tabular font-semibold text-foreground">
              {entry.value.toLocaleString('en-PK')}
            </span>
            <span className="tabular w-12 text-right text-xs text-muted-foreground">
              {Math.round((entry.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Booking status ─────────────────────────────────────────────────────

const BOOKING_TONES = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  completed: 'brand',
};

const BOOKING_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export function BookingStatusChart({ data, height = 260 }) {
  const theme = useChartTheme();
  const rows = data.map((d) => ({ ...d, label: BOOKING_LABELS[d.status] || d.status }));
  const total = rows.reduce((n, d) => n + d.value, 0);

  if (!total) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No booking requests in this period.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(theme)} />
        <YAxis width={44} allowDecimals={false} {...axisProps(theme)} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.grid, fillOpacity: 0.35 }} />
        <Bar dataKey="value" name="Requests" radius={[6, 6, 0, 0]}>
          {rows.map((row) => (
            <Cell key={row.status} fill={theme[BOOKING_TONES[row.status] || 'neutral']} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Rating trend ───────────────────────────────────────────────────────

export function RatingTrendChart({ data, height = 260 }) {
  const theme = useChartTheme();
  const hasPoints = data.some((d) => d.rating !== null);

  if (!hasPoints) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        No reviews yet — your rating trend starts with your first review.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={28} {...axisProps(theme)} />
        <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} width={36} {...axisProps(theme)} />
        <Tooltip
          content={<ChartTooltip labelFormatter={formatDayLabel} />}
          cursor={{ stroke: theme.grid, strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="rating"
          name="Average rating"
          stroke={theme.accent}
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Compact sparkline-style area used on the dashboard stat strip. */
export function MiniTrend({ data, dataKey = 'views', className }) {
  const theme = useChartTheme();
  return (
    <div className={cn('h-12 w-full', className)} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`mini-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.brand} stopOpacity={0.35} />
              <stop offset="100%" stopColor={theme.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={theme.brand}
            strokeWidth={1.75}
            fill={`url(#mini-${dataKey})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
