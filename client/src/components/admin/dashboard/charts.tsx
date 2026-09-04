'use client';

import {
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
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/ui/feedback';
import type { DashboardCharts, NamedTotal } from '@/lib/api/admin';

/**
 * Dashboard charts for a catalogue-only business.
 *
 * Everything here counts *demand* — inquiries and units asked for — not money.
 * The only currency figures on this dashboard are the pipeline KPI cards, and
 * those are labelled as quoted value rather than income.
 *
 * Palette is deliberately narrow: navy and cyan carry the data, with amber and
 * green reserved for status meaning. A rainbow would fight the brand.
 */
const NAVY = '#1B2A6B';
const CYAN = '#00AEEF';

/* Keys are the inquiry status enum, plus the friendlier labels the dashboard
   passes for `quoted_verbally`. Unknown keys fall back to navy. */
const STATUS_COLOURS: Record<string, string> = {
  new: '#00AEEF',
  contacted: '#D9A21B',
  quoted: '#3F51A8',
  quoted_verbally: '#3F51A8',
  negotiating: '#7A5AC4',
  won: '#1F8A5F',
  lost: '#B23B3B',
  cancelled: '#8A8F99',
};

/** Compact axis labels: 1.9k rather than 1,915. */
function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #D8DEE9',
    fontSize: 12,
    fontFamily: 'var(--font-inter)',
  },
} as const;

/**
 * Inquiries received vs. inquiries won, over time.
 *
 * The gap between the two lines is everything still in play, and that gap is
 * the number worth seeing — so both are plotted on one axis rather than split
 * across two cards where the comparison would be lost.
 */
export function InquiryChart({
  data,
}: {
  data: DashboardCharts['inquiriesOverTime'];
}): JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="No inquiries in this period" description="Pick a wider date range." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          allowDecimals={false}
          tickFormatter={compact}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <RechartsTooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [
            value,
            name === 'inquiries' ? 'Inquiries received' : 'Won',
          ]}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="plainline"
          formatter={(value: string) => (
            <span className="text-xs text-foreground">
              {value === 'inquiries' ? 'Inquiries received' : 'Won'}
            </span>
          )}
        />
        <Line type="monotone" dataKey="inquiries" stroke={NAVY} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="won" stroke={CYAN} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Where every inquiry currently sits in the pipeline. */
export function PipelineDonut({ data }: { data: Record<string, number> }): JSX.Element {
  const slices = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status, value: count }));

  if (slices.length === 0) {
    return (
      <EmptyState title="No inquiries yet" description="They will appear here as they arrive." />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
        >
          {slices.map((slice) => (
            <Cell key={slice.name} fill={STATUS_COLOURS[slice.name] ?? '#8A8F99'} />
          ))}
        </Pie>
        <RechartsTooltip {...tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value: string) => (
            <span className="text-xs capitalize text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Horizontal demand bars — product, brand and category names are far too long
 * for vertical ticks.
 *
 * Units requested rides along in the tooltip: ten inquiries for one breaker
 * each and one enquiry for a thousand metres of cable are different businesses,
 * and the bar count alone cannot tell them apart.
 */
export function DemandBarChart({
  data,
  colour = NAVY,
}: {
  data: NamedTotal[];
  colour?: string;
}): JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="No data yet" description="This fills in once inquiries come through." />;
  }

  const rows = data.slice(0, 8).map((row) => ({
    ...row,
    label: row.name.length > 28 ? `${row.name.slice(0, 27)}…` : row.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickFormatter={compact}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <RechartsTooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [
            value,
            name === 'units' ? 'Units requested' : 'Inquiries',
          ]}
        />
        <Bar dataKey="enquiries" fill={colour} radius={[0, 4, 4, 0]} barSize={16} />
        {/* Hidden series so the tooltip can surface units without a second bar. */}
        <Bar dataKey="units" fill="transparent" barSize={0} legendType="none" />
      </BarChart>
    </ResponsiveContainer>
  );
}
