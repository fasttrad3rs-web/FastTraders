'use client';

import {
  AlertTriangle,
  CalendarClock,
  FileText,
  Inbox,
  Ship,
  Target,
  TrendingUp,
} from 'lucide-react';
import { StatCard } from '@/components/admin/primitives';
import { formatPKR } from '@/lib/utils';
import type { DashboardStats } from '@/lib/api/admin';

/**
 * The six-to-eight numbers at the top of the dashboard.
 *
 * Split out of the page purely for size — the page was over the 300-line rule
 * once the pipeline cards landed. Order is the point: the two numbers that
 * represent *work owed to a customer* come first, and everything below them is
 * context for a quieter moment.
 */
export function DashboardKpis({
  stats,
  loading,
  winValueRate,
}: {
  stats: DashboardStats | undefined;
  loading: boolean;
  winValueRate: number | undefined;
}): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {/*
        Overdue leads first, and styled as a warning when non-zero. Every
        other number on this page is context; this one is a job. An inquiry
        that nobody has phoned is the only true failure state this business
        has, and it is invisible unless something shouts.
      */}
      <StatCard
        label="Overdue — not yet contacted"
        value={stats?.overdue ?? 0}
        hint={
          (stats?.overdue ?? 0) > 0
            ? 'Still new after a full working day'
            : 'Nothing waiting — good'
        }
        Icon={AlertTriangle}
        invertChange
        loading={loading}
      />
      <StatCard
        label="Follow-ups due"
        value={stats?.followUpsDue ?? 0}
        hint="Chase dates that have arrived or passed"
        Icon={CalendarClock}
        invertChange
        loading={loading}
      />
      <StatCard
        label="New inquiries today"
        value={stats?.inquiries.newToday ?? 0}
        hint={`${stats?.inquiries.newThisWeek ?? 0} this week · ${stats?.inquiries.total ?? 0} all time`}
        Icon={Inbox}
        loading={loading}
      />
      <StatCard
        label="Open inquiries"
        value={stats?.inquiries.open ?? 0}
        hint={`${stats?.unassigned ?? 0} new with nobody assigned`}
        Icon={FileText}
        loading={loading}
      />
      <StatCard
        label="Quoted this month"
        value={formatPKR(stats?.pipeline.quotedThisMonth ?? 0)}
        change={winValueRate}
        hint={`${formatPKR(stats?.pipeline.wonThisMonth ?? 0)} won`}
        Icon={TrendingUp}
        loading={loading}
      />
      <StatCard
        label="Win rate"
        value={`${stats?.winRate ?? 0}%`}
        hint={`${stats?.inquiries.total ?? 0} inquiries all time · ${formatPKR(
          stats?.pipeline.averageQuote ?? 0,
        )} average quote`}
        Icon={Target}
        loading={loading}
      />
      <StatCard
        label="Low stock"
        value={stats?.inventory.lowStock ?? 0}
        hint={`${stats?.inventory.outOfStock ?? 0} out of stock`}
        Icon={AlertTriangle}
        invertChange
        loading={loading}
      />
      <StatCard
        label="Import items"
        value={stats?.inventory.imported ?? 0}
        hint={`of ${stats?.inventory.totalActive ?? 0} active products — sourced on request`}
        Icon={Ship}
        loading={loading}
      />
    </div>
  );
}
