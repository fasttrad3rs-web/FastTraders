'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { OrderDetail } from '@/components/order/order-detail';
import { OrderActions } from '@/components/admin/orders/order-actions';
import { PageHeader } from '@/components/admin/primitives';
import { useAdminOrder } from '@/lib/api/admin';
import { formatDate } from '@/lib/utils';

/**
 * Admin order detail.
 *
 * Reuses the customer-facing `OrderDetail` for the read-only half — one
 * presentation of an order means the admin and the customer can never be
 * looking at different numbers — with the admin action rail beside it.
 */
export default function AdminOrderPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { data: order, isPending, isError, refetch } = useAdminOrder(params.id);

  if (isPending) {
    return (
      <>
        <PageHeader title="Order" />
        <Skeleton className="h-96 w-full" />
      </>
    );
  }

  if (isError || !order) {
    return <ErrorState title="Order not found" onRetry={() => void refetch()} />;
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/admin/orders">
          <ArrowLeft />
          All orders
        </Link>
      </Button>

      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDate(order.createdAt)} by ${order.customer.name}`}
        actions={
          <>
            <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'muted'}>
              {order.paymentStatus}
            </Badge>
            <Badge variant="default">{order.orderStatus}</Badge>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <OrderDetail order={order} />
        <OrderActions order={order} />
      </div>
    </>
  );
}
