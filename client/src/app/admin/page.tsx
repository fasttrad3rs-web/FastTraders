'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/feedback';
import { PageHeader } from '@/components/admin/primitives';
import { DashboardKpis } from '@/components/admin/dashboard-kpis';
import { PipelinePanels } from '@/components/admin/pipeline-panels';
import { DemandBarChart, InquiryChart, PipelineDonut } from '@/components/admin/dashboard/charts';
import { RecentActivity } from '@/components/admin/dashboard/recent';
import { useAdminCharts, useAdminRecent, useAdminStats } from '@/lib/api/admin';

const RANGES = [
  { label: 'Last 7 days', days: 7, granularity: 'daily' as const },
  { label: 'Last 30 days', days: 30, granularity: 'daily' as const },
  { label: 'Last 90 days', days: 90, granularity: 'weekly' as const },
  { label: 'Last 12 months', days: 365, granularity: 'monthly' as const },
];

/**
 * Admin dashboard for a catalogue-only business.
 *
 * There is no revenue here because the site takes no money. The funnel that
 * matters is inquiry → contacted → quoted on the phone → won, and the two
 * figures carrying money are labelled *pipeline*: a verbal quote is not income
 * until it is paid at the counter.
 */
export default function AdminDashboardPage(): JSX.Element {
  const [rangeIndex, setRangeIndex] = useState(1);
  const range = RANGES[rangeIndex] ?? RANGES[1];

  const { data: stats, isPending } = useAdminStats();
  const { data: charts, isFetching } = useAdminCharts(range?.granularity ?? 'daily', range?.days ?? 30);
  const { data: recent } = useAdminRecent();

  /**
   * Pipeline conversion for the month: of everything quoted, how much was won.
   * Undefined rather than 0 when nothing has been quoted, so the card shows no
   * arrow instead of a misleading flat one.
   */
  const winValueRate = ((): number | undefined => {
    if (!stats || stats.pipeline.quotedThisMonth === 0) return undefined;
    return (stats.pipeline.wonThisMonth / stats.pipeline.quotedThisMonth) * 100;
  })();

  /*
   * The donut reads `byStatus`, which the API returns keyed by the inquiry
   * status enum. Listing the buckets explicitly rather than rendering whatever
   * arrives keeps the slice order — and so the colours — stable between loads.
   */
  const status = (key: string): number => stats?.byStatus[key] ?? 0;
  const pipelineSlices: Record<string, number> = {
    new: status('new'),
    contacted: status('contacted'),
    quoted: status('quoted_verbally'),
    negotiating: status('negotiating'),
    won: status('won'),
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Inquiries, pipeline and everything waiting on you."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports">View reports</Link>
          </Button>
        }
      />

      <DashboardKpis stats={stats} loading={isPending} winValueRate={winValueRate} />

      <PipelinePanels
        byCity={stats?.byCity ?? []}
        topRequestedNotStocked={stats?.topRequestedNotStocked ?? []}
        loading={isPending}
      />

      <section className="mt-6 rounded-lg border border-border bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Inquiries received vs. won
            </h2>
            <p className="text-2xs text-muted-foreground">
              The gap between the two lines is everything still in play.
            </p>
          </div>
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
          <InquiryChart data={charts?.inquiriesOverTime ?? []} />
        )}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Inquiry pipeline">
          <PipelineDonut data={pipelineSlices} />
        </ChartCard>
        <ChartCard title="Most requested products">
          <DemandBarChart data={charts?.topInquiredProducts ?? []} />
        </ChartCard>
        <ChartCard title="Inquiries by brand">
          <DemandBarChart data={charts?.inquiriesByBrand ?? []} colour="#00AEEF" />
        </ChartCard>
        <ChartCard title="Inquiries by category">
          <DemandBarChart data={charts?.inquiriesByCategory ?? []} colour="#3F51A8" />
        </ChartCard>
      </div>

      {/*
        Two follow-up prompts, shown only when there is something to act on.
        An abandoned shortlist is a warm lead that never pressed send, which is
        the cheapest business in the building to go and win back.
      */}
      {stats && stats.abandonedLists > 0 ? (
        <FollowUp
          icon={<Award className="size-4 text-brand-cyan" aria-hidden />}
          title="Shortlists that never became an inquiry"
          body={
            <>
              <Badge variant="accent">{stats.abandonedLists}</Badge> visitors built a list and did not
              send it. There are no customer accounts on this site, so these are anonymous — the
              number is a signal about the form, not a list of people to ring.
            </>
          }
          tone="accent"
        />
      ) : null}

      {stats && stats.inventory.lowStock + stats.inventory.outOfStock > 0 ? (
        <FollowUp
          icon={<AlertTriangle className="size-4 text-warning" aria-hidden />}
          title="Stock needs attention"
          body={
            <>
              <Badge variant="warning">{stats.inventory.lowStock}</Badge> at or below their low-stock
              threshold and <Badge variant="danger">{stats.inventory.outOfStock}</Badge> out of stock,
              across {stats.inventory.totalActive} active products.
            </>
          }
          actions={
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/products?lowStock=true">Review low stock</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/products?outOfStock=true">Out of stock</Link>
              </Button>
            </>
          }
          tone="warning"
        />
      ) : null}

      {stats && stats.pending.testimonials > 0 ? (
        <FollowUp
          icon={<Award className="size-4 text-brand-cyan" aria-hidden />}
          title="Testimonials awaiting publication"
          body={
            <>
              <Badge variant="accent">{stats.pending.testimonials}</Badge> drafted quotes are not yet
              visible on the storefront.
            </>
          }
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/testimonials">Review testimonials</Link>
            </Button>
          }
          tone="accent"
        />
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

function FollowUp({
  icon,
  title,
  body,
  actions,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  /** Omitted where there is genuinely nothing to click through to. */
  actions?: React.ReactNode;
  tone: 'accent' | 'warning';
}): JSX.Element {
  const shell =
    tone === 'warning'
      ? 'border-warning/40 bg-warning/10'
      : 'border-brand-cyan/40 bg-brand-cyan/5';

  return (
    <section className={`mt-6 rounded-lg border p-5 ${shell}`}>
      <h2 className="flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        {icon}
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
    </section>
  );
}
