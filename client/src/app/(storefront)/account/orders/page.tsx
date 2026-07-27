'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { OrderStatusBadge } from '@/components/order/order-detail';
import { useMyOrders } from '@/lib/api/account';
import { formatDate, formatPKR } from '@/lib/utils';

export default function MyOrdersPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isPending } = useMyOrders(page);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
        My Orders
      </h1>

      {isPending ? (
        <div className="mt-6 space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No orders yet"
          description="Orders you place will appear here with their full history."
          icon={<Package />}
          action={
            <Button asChild variant="cta">
              <Link href="/products">Browse the catalogue</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {data.items.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand-cyan"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-brand-navy">{order.orderNumber}</p>
                    <p className="mt-0.5 text-2xs text-muted-foreground">
                      {formatDate(order.createdAt)} · {order.items.length} line
                      {order.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.orderStatus} />
                    <span className="font-heading font-bold tabular-nums text-brand-navy">
                      {formatPKR(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}
    </div>
  );
}
