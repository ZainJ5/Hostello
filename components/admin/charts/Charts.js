'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompact } from '@/lib/utils';
import { shortDay } from '@/components/admin/client';

/**
 * Slots 1–5 are the validated categorical order; ramp 1–5 is the single-hue
 * ordinal ramp. Both are defined on `.admin-scope` in app/(admin)/layout.js and
 * re-stepped for the dark surface there, so a chart never names a colour.
 */
export const SLOT = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
export const RAMP = ['var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)', 'var(--ramp-5)'];

// Line patterns double as identity, so the series are distinguishable without colour.
export const DASH = [undefined, '6 4', '2 3', '10 4 2 4', '1 4'];

const GRID = 'var(--chart-grid)';
const AXIS = 'var(--chart-axis)';
const SURFACE = 'var(--chart-surface)';

const AXIS_LABEL = { fill: AXIS, fontSize: 11 };
const TICK = { fill: AXIS, fontSize: 11 };

function num(v) {
  return Number(v || 0).toLocaleString('en-PK');
}

/** One tooltip for every chart — same geometry, same type scale, both themes. */
function AdminTooltip({ active, payload, label, labelFormatter, valueFormatter, total }) {
  if (!active || !payload?.length) return null;
  const fmt = valueFormatter || num;
  return (
    <div className="pointer-events-none min-w-40 rounded-xl border border-border bg-surface-raised px-3 py-2 shadow-xl">
      <p className="mb-1.5 text-xs font-semibold text-foreground">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      <ul className="space-y-1">
        {payload.map((p, i) => (
          <li key={`${p.dataKey ?? p.name}-${i}`} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: p.color || p.stroke || p.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="tabular ml-auto font-semibold text-foreground">{fmt(p.value)}</span>
            {total ? (
              <span className="tabular text-muted-foreground">
                {total ? `${Math.round((p.value / total) * 100)}%` : ''}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CURSOR_LINE = { stroke: GRID, strokeWidth: 1 };
const CURSOR_FILL = { fill: 'var(--muted)', fillOpacity: 0.55 };

// ─── Time series ─────────────────────────────────────────────────────────

/** Single-measure area. One series, so no legend — the card title names it. */
export function TrafficArea({ data, dataKey = 'views', name = 'Views', yLabel = 'Page views' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
        <defs>
          <linearGradient id="admin-area-1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SLOT[0]} stopOpacity={0.28} />
            <stop offset="100%" stopColor={SLOT[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDay}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={24}
          label={{ value: 'Date', position: 'insideBottom', offset: -12, style: AXIS_LABEL }}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={44}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', style: AXIS_LABEL }}
        />
        <Tooltip
          cursor={CURSOR_LINE}
          content={<AdminTooltip labelFormatter={shortDay} />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={SLOT[0]}
          strokeWidth={2}
          fill="url(#admin-area-1)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Multi-measure lines. Colour + dash pattern + legend carry identity. */
export function MultiLine({ data, series, yLabel = 'Events' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDay}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={24}
          label={{ value: 'Date', position: 'insideBottom', offset: -12, style: AXIS_LABEL }}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={44}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', style: AXIS_LABEL }}
        />
        <Tooltip cursor={CURSOR_LINE} content={<AdminTooltip labelFormatter={shortDay} />} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={SLOT[i % SLOT.length]}
            strokeWidth={2}
            strokeDasharray={DASH[i % DASH.length]}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: SURFACE }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Stacked daily bars — a 2px surface gap keeps segments from fusing. */
export function StackedBars({ data, series, yLabel = 'New users' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDay}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={24}
          label={{ value: 'Date', position: 'insideBottom', offset: -12, style: AXIS_LABEL }}
        />
        <YAxis
          allowDecimals={false}
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', style: AXIS_LABEL }}
        />
        <Tooltip cursor={CURSOR_FILL} content={<AdminTooltip labelFormatter={shortDay} />} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId="roles"
            fill={SLOT[i % SLOT.length]}
            stroke={SURFACE}
            strokeWidth={1}
            radius={i === series.length - 1 ? [3, 3, 0, 0] : 0}
            maxBarSize={26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Categorical comparisons ─────────────────────────────────────────────

/**
 * Horizontal bars for nominal categories (cities, universities). One series →
 * one hue; bar length already encodes the value, so hue stays free.
 */
export function CategoryBars({ data, xLabel = 'Listings', categoryWidth = 110 }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 34, bottom: 18, left: 4 }}
        barCategoryGap="22%"
      >
        <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          label={{ value: xLabel, position: 'insideBottom', offset: -12, style: AXIS_LABEL }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={categoryWidth}
        />
        <Tooltip cursor={CURSOR_FILL} content={<AdminTooltip />} />
        <Bar dataKey="count" name={xLabel} fill={SLOT[0]} radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="tabular"
            style={{ fill: AXIS, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Vertical histogram over ordered price bands. */
export function Histogram({ data, xLabel = 'Monthly rent', yLabel = 'Listings' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 14, right: 12, bottom: 24, left: 4 }}>
        <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={0}
          label={{ value: xLabel, position: 'insideBottom', offset: -14, style: AXIS_LABEL }}
        />
        <YAxis
          allowDecimals={false}
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', style: AXIS_LABEL }}
        />
        <Tooltip cursor={CURSOR_FILL} content={<AdminTooltip />} />
        <Bar dataKey="count" name="Listings" fill={SLOT[0]} radius={[4, 4, 0, 0]} maxBarSize={54}>
          <LabelList
            dataKey="count"
            position="top"
            className="tabular"
            style={{ fill: AXIS, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Ordered categories (1★ → 5★) take the single-hue ordinal ramp. */
export function OrdinalBars({ data, xLabel = 'Reviews' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 34, bottom: 18, left: 4 }}
        barCategoryGap="22%"
      >
        <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          label={{ value: xLabel, position: 'insideBottom', offset: -12, style: AXIS_LABEL }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip cursor={CURSOR_FILL} content={<AdminTooltip />} />
        <Bar dataKey="count" name={xLabel} radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell key={d.label} fill={RAMP[i % RAMP.length]} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="tabular"
            style={{ fill: AXIS, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Funnel stages are ordered, so they take the ramp, darkest at the top. */
export function FunnelBars({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 18, left: 4 }}
        barCategoryGap="28%"
      >
        <CartesianGrid stroke={GRID} strokeWidth={1} horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatCompact}
          tick={TICK}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          label={{ value: 'Events in period', position: 'insideBottom', offset: -12, style: AXIS_LABEL }}
        />
        <YAxis
          type="category"
          dataKey="stage"
          tick={TICK}
          tickLine={false}
          axisLine={false}
          width={78}
        />
        <Tooltip cursor={CURSOR_FILL} content={<AdminTooltip />} />
        <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} maxBarSize={26}>
          {data.map((d, i) => (
            <Cell key={d.stage} fill={RAMP[Math.min(i, RAMP.length - 1)]} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            className="tabular"
            formatter={formatCompact}
            style={{ fill: AXIS, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Part-to-whole for at most three segments. Labels sit outside the ring in
 * text ink, so the reader never has to decode a colour to get a number.
 */
/**
 * Rounds shares to whole percents that still add up to 100. Rounding each
 * slice independently drifts — 48.8 / 48.0 / 0.8 renders as 49 / 48 / 1 or,
 * with different inputs, as a visible "101%". Largest-remainder assigns the
 * leftover points to the slices with the biggest fractional parts.
 */
function wholePercents(counts, sum) {
  if (!sum) return counts.map(() => 0);
  const exact = counts.map((c) => (c / sum) * 100);
  const floors = exact.map(Math.floor);
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    out[order[k].i] += 1;
  }
  return out;
}

export function Donut({ data, total }) {
  const sum = total ?? data.reduce((a, d) => a + d.count, 0);
  const percents = wholePercents(data.map((d) => d.count), sum);

  const renderLabel = ({ cx, cy, midAngle, outerRadius, index }) => {
    const RAD = Math.PI / 180;
    const r = outerRadius + 22;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    const d = data[index];
    if (!d || !sum) return null;
    return (
      <text
        x={x}
        y={y}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fill: AXIS, fontSize: 11 }}
      >
        {`${d.label} ${percents[index]}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
        <Tooltip content={<AdminTooltip total={sum} />} />
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="76%"
          paddingAngle={2}
          stroke={SURFACE}
          strokeWidth={2}
          label={renderLabel}
          labelLine={false}
          isAnimationActive={false}
        >
          {data.map((d, i) => (
            <Cell key={d.label} fill={SLOT[i % SLOT.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
