'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { OrderDetail, OrderStatusBadge } from '@/components/order/order-detail';
import { useOrder } from '@/lib/api/account';
import { formatDate } from '@/lib/utils';

export default function AccountOrderPage(): JSX.Element {
  const params = useParams<{ orderNumber: string }>();
  const { data: order, isPending, isError, refetch } = useOrder(params.orderNumber);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/account/orders">
          <ArrowLeft />
          All orders
        </Link>
      </Button>

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError || !order ? (
        <ErrorState title="Order not found" onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy">
                {order.orderNumber}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.orderStatus} />
          </div>

          <OrderDetail order={order} />
        </>
      )}
    </div>
  );
}
