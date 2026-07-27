'use client';

import Link from 'next/link';
import { ArrowRight, FileText, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/feedback';
import { OrderStatusBadge } from '@/components/order/order-detail';
import { useMyOrders, useMyQuotations } from '@/lib/api/account';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatPKR } from '@/lib/utils';

/** Account dashboard: the three things a returning buyer actually wants. */
export default function AccountDashboard(): JSX.Element {
  const { user } = useAuth();
  const orders = useMyOrders(1);
  const quotations = useMyQuotations(1);

  const recentOrders = orders.data?.items.slice(0, 4) ?? [];
  const openQuotes = quotations.data?.items.filter((q) => ['quoted', 'negotiating'].includes(q.status)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
          Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your orders, quotations and saved addresses.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Orders placed', value: orders.data?.meta.total ?? 0, Icon: Package, href: '/account/orders' },
          { label: 'Quotations', value: quotations.data?.meta.total ?? 0, Icon: FileText, href: '/account/quotations' },
          { label: 'Awaiting your reply', value: openQuotes.length, Icon: MapPin, href: '/account/quotations' },
        ].map(({ label, value, Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border border-border bg-white p-5 transition-colors hover:border-brand-cyan"
          >
            <Icon className="size-5 text-brand-cyan" aria-hidden />
            <dt className="mt-3 text-xs text-muted-foreground">{label}</dt>
            <dd className="font-heading text-2xl font-extrabold text-brand-navy">{value}</dd>
          </Link>
        ))}
      </dl>

      {openQuotes.length > 0 ? (
        <section className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Quotations awaiting your response
          </h2>
          <ul className="mt-3 space-y-2">
            {openQuotes.slice(0, 3).map((quote) => (
              <li key={quote.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link
                  href={`/account/quotations/${quote.quoteNumber}`}
                  className="font-mono font-medium text-brand-navy hover:text-brand-cyan"
                >
                  {quote.quoteNumber}
                </Link>
                <span className="font-semibold tabular-nums">
                  {typeof quote.quotedTotal === 'number' ? formatPKR(quote.quotedTotal) : 'Pricing'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Recent orders
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/account/orders">
              View all
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {orders.isPending ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentOrders.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No orders yet.{' '}
            <Link href="/products" className="text-brand-cyan hover:underline">
              Browse the catalogue
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <Link
                    href={`/account/orders/${order.orderNumber}`}
                    className="font-mono text-sm font-medium text-brand-navy hover:text-brand-cyan"
                  >
                    {order.orderNumber}
                  </Link>
                  <p className="text-2xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.orderStatus} />
                  <span className="font-semibold tabular-nums">{formatPKR(order.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
