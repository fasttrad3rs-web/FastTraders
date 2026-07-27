'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Banknote,
  FileText,
  Package,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/feedback';
import { PageHeader, StatCard } from '@/components/admin/primitives';
import { OrdersDonut, RevenueChart, TotalsBarChart } from '@/components/admin/dashboard/charts';
import { RecentActivity } from '@/components/admin/dashboard/recent';
import { useAdminCharts, useAdminRecent, useAdminStats } from '@/lib/api/admin';
import { formatPKR } from '@/lib/utils';

const RANGES = [
  { label: 'Last 7 days', days: 7, granularity: 'daily' as const },
  { label: 'Last 30 days', days: 30, granularity: 'daily' as const },
  { label: 'Last 90 days', days: 90, granularity: 'weekly' as const },
  { label: 'Last 12 months', days: 365, granularity: 'monthly' as const },
];

/**
 * Admin dashboard.
 *
 * Period-over-period change is derived client-side from the cumulative figures
 * the API returns — today vs. the daily average of the month, month vs. the
 * monthly average of the year. It is an indicative trend, and the tooltip on
 * each card says so rather than implying an exact comparison.
 */
export default function AdminDashboardPage(): JSX.Element {
  const [rangeIndex, setRangeIndex] = useState(1);
  const range = RANGES[rangeIndex] ?? RANGES[1];

  const { data: stats, isPending } = useAdminStats();
  const { data: charts, isFetching } = useAdminCharts(range?.granularity ?? 'daily', range?.days ?? 30);
  const { data: recent } = useAdminRecent();

  /** Percentage difference between a period and a baseline average. */
  const change = (current: number, baselineTotal: number, periods: number): number | undefined => {
    if (periods <= 0) return undefined;
    const baseline = baselineTotal / periods;
    if (baseline === 0) return current > 0 ? 100 : 0;
    return ((current - baseline) / baseline) * 100;
  };

  const today = new Date().getDate();
  const month = new Date().getMonth() + 1;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Revenue, orders and everything waiting on you."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports">View reports</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Revenue today"
          value={formatPKR(stats?.revenue.today.revenue ?? 0)}
          change={stats ? change(stats.revenue.today.revenue, stats.revenue.month.revenue, today) : undefined}
          Icon={Banknote}
          loading={isPending}
        />
        <StatCard
          label="Revenue this month"
          value={formatPKR(stats?.revenue.month.revenue ?? 0)}
          change={stats ? change(stats.revenue.month.revenue, stats.revenue.year.revenue, month) : undefined}
          Icon={TrendingUp}
          loading={isPending}
        />
        <StatCard
          label="Orders this month"
          value={stats?.revenue.month.orders ?? 0}
          hint={`${stats?.revenue.today.orders ?? 0} today`}
          Icon={Package}
          loading={isPending}
        />
        <StatCard
          label="Pending quotations"
          value={stats?.quotations.new ?? 0}
          hint={`${stats?.quotations.awaitingResponse ?? 0} awaiting customer reply`}
          Icon={FileText}
          loading={isPending}
        />
        <StatCard
          label="Low stock"
          value={stats?.inventory.lowStock ?? 0}
          hint={`${stats?.inventory.outOfStock ?? 0} out of stock`}
          Icon={AlertTriangle}
          invertChange
          loading={isPending}
        />
        <StatCard
          label="Average order value"
          value={formatPKR(stats?.averageOrderValue ?? 0)}
          hint={`${stats?.customers.newThisMonth ?? 0} new customers this month`}
          Icon={UserPlus}
          loading={isPending}
        />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Revenue over time
          </h2>
          <Select value={String(rangeIndex)} onValueChange={(value) => setRangeIndex(Number(value))}>
            <SelectTrigger className="h-9 w-[170px]" aria-label="Chart date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((option, index) => (
                <SelectItem key={option.label} value={String(index)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isFetching && !charts ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <RevenueChart data={charts?.salesOverTime ?? []} />
        )}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Orders by status">
          <OrdersDonut data={stats?.ordersByStatus ?? {}} />
        </ChartCard>
        <ChartCard title="Top products by revenue">
          <TotalsBarChart data={charts?.topProducts ?? []} />
        </ChartCard>
        <ChartCard title="Revenue by brand">
          <TotalsBarChart data={charts?.revenueByBrand ?? []} colour="#00AEEF" />
        </ChartCard>
        <ChartCard title="Revenue by category">
          <TotalsBarChart data={charts?.revenueByCategory ?? []} colour="#3F51A8" />
        </ChartCard>
      </div>

      {stats && stats.inventory.lowStock + stats.inventory.outOfStock > 0 ? (
        <section className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-5">
          <h2 className="flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            <AlertTriangle className="size-4 text-warning" aria-hidden />
            Stock needs attention
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <Badge variant="warning">{stats.inventory.lowStock}</Badge> at or below their low-stock
            threshold and <Badge variant="danger">{stats.inventory.outOfStock}</Badge> out of stock,
            across {stats.inventory.totalActive} active products.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products?lowStock=true">Review low stock</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/products?outOfStock=true">Out of stock</Link>
            </Button>
          </div>
        </section>
      ) : null}

      <RecentActivity data={recent} />
    </>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <h2 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        {title}
      </h2>
      {children}
    </section>
  );
}
