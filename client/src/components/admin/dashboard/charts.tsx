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
import { formatPKR } from '@/lib/utils';
import type { DashboardCharts, NamedTotal } from '@/lib/api/admin';

/**
 * Dashboard charts.
 *
 * Palette is deliberately narrow — navy and cyan carry the data, with amber
 * and green reserved for status meaning. A rainbow would fight the brand.
 */
const NAVY = '#1B2A6B';
const CYAN = '#00AEEF';
const STATUS_COLOURS: Record<string, string> = {
  pending: '#D9A21B',
  confirmed: '#1B2A6B',
  processing: '#3F51A8',
  shipped: '#00AEEF',
  delivered: '#1F8A5F',
  cancelled: '#B23B3B',
  returned: '#8A8F99',
};

/** Compact axis labels: 1.9M rather than 1,915,420. */
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

export function RevenueChart({ data }: { data: DashboardCharts['salesOverTime'] }): JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="No sales in this period" description="Pick a wider date range." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" vertical={false} />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <RechartsTooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) =>
            name === 'revenue' ? [formatPKR(value), 'Revenue'] : [value, 'Orders']
          }
        />
        <Line type="monotone" dataKey="revenue" stroke={NAVY} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="orders" stroke={CYAN} strokeWidth={2} dot={false} yAxisId={0} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OrdersDonut({ data }: { data: Record<string, number> }): JSX.Element {
  const slices = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: status, value: count }));

  if (slices.length === 0) {
    return <EmptyState title="No orders yet" description="Order statuses will appear here." />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
          {slices.map((slice) => (
            <Cell key={slice.name} fill={STATUS_COLOURS[slice.name] ?? '#8A8F99'} />
          ))}
        </Pie>
        <RechartsTooltip {...tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value: string) => <span className="text-xs capitalize text-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars — product and brand names are too long for vertical ticks. */
export function TotalsBarChart({
  data,
  colour = NAVY,
}: {
  data: NamedTotal[];
  colour?: string;
}): JSX.Element {
  if (data.length === 0) {
    return <EmptyState title="No data yet" description="This fills in once orders come through." />;
  }

  const rows = data.slice(0, 8).map((row) => ({
    ...row,
    label: row.name.length > 28 ? `${row.name.slice(0, 27)}…` : row.name,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E9F0" horizontal={false} />
        <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <RechartsTooltip {...tooltipStyle} formatter={(value: number) => [formatPKR(value), 'Revenue']} />
        <Bar dataKey="revenue" fill={colour} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
