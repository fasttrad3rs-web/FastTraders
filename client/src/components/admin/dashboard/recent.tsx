'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/feedback';
import { formatDate, formatPKR } from '@/lib/utils';

/**
 * Recent activity: latest orders and quotations side by side.
 *
 * The `/admin/dashboard/recent` endpoint returns loosely typed collections, so
 * each row is read through narrow accessors rather than casting the payload.
 */

type Row = Record<string, unknown>;

const str = (row: Row, key: string): string => (typeof row[key] === 'string' ? (row[key] as string) : '');
const num = (row: Row, key: string): number => (typeof row[key] === 'number' ? (row[key] as number) : 0);
const customerName = (row: Row): string => {
  const customer = row.customer;
  if (customer && typeof customer === 'object' && 'name' in customer) {
    const name = (customer as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  return '';
};

export function RecentActivity({ data }: { data?: Record<string, unknown[]> }): JSX.Element {
  const orders = (data?.orders ?? []) as Row[];
  const quotations = (data?.quotations ?? []) as Row[];

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <Panel title="Recent orders" href="/admin/orders" loading={!data}>
        {orders.length === 0 ? (
          <Empty label="No orders yet." />
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 6).map((order) => (
              <li key={str(order, 'orderNumber')} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/admin/orders/${str(order, '_id') || str(order, 'id')}`}
                    className="font-mono text-xs font-semibold text-brand-navy hover:text-brand-cyan"
                  >
                    {str(order, 'orderNumber')}
                  </Link>
                  <p className="truncate text-2xs text-muted-foreground">
                    {customerName(order)} · {formatDate(str(order, 'createdAt'))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="muted">{str(order, 'orderStatus')}</Badge>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatPKR(num(order, 'total'))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent quotations" href="/admin/quotations" loading={!data}>
        {quotations.length === 0 ? (
          <Empty label="No quotation requests yet." />
        ) : (
          <ul className="divide-y divide-border">
            {quotations.slice(0, 6).map((quote) => (
              <li key={str(quote, 'quoteNumber')} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/admin/quotations/${str(quote, '_id') || str(quote, 'id')}`}
                    className="font-mono text-xs font-semibold text-brand-navy hover:text-brand-cyan"
                  >
                    {str(quote, 'quoteNumber')}
                  </Link>
                  <p className="truncate text-2xs text-muted-foreground">
                    {customerName(quote)} · {formatDate(str(quote, 'createdAt'))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={str(quote, 'status') === 'new' ? 'accent' : 'muted'}>
                    {str(quote, 'status')}
                  </Badge>
                  <span className="text-xs font-semibold tabular-nums">
                    {num(quote, 'quotedTotal') > 0 ? formatPKR(num(quote, 'quotedTotal')) : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  href,
  loading,
  children,
}: {
  title: string;
  href: string;
  loading: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">{title}</h2>
        <Link href={href} className="text-xs font-medium text-brand-cyan hover:underline">
          View all
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Empty({ label }: { label: string }): JSX.Element {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}
