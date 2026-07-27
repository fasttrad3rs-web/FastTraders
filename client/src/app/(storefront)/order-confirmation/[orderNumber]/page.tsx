'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, MessageCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/feedback';
import { OrderDetail, OrderStatusBadge } from '@/components/order/order-detail';
import { useTrackOrder } from '@/lib/api/mutations';
import { CONTACT } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

/**
 * Order confirmation.
 *
 * Client-rendered and never indexed — an order number plus email is the only
 * key, and we do not want these pages in a sitemap or a crawler's cache.
 */
export default function OrderConfirmationPage(): JSX.Element {
  const params = useParams<{ orderNumber: string }>();
  const searchParams = useSearchParams();
  const orderNumber = params.orderNumber;
  const email = searchParams.get('email') ?? '';

  const lookup = useTrackOrder();
  const clearCart = useCartStore((state) => state.clear);

  useEffect(() => {
    // The server already emptied the cart; clear the local mirror too.
    clearCart('shopping');
    lookup.mutate({ orderNumber, email });
    // Intentionally runs once per order number.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const order = lookup.data;

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-9" aria-hidden />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
          Thank you — order received
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order number is{' '}
          <span className="font-mono font-bold text-brand-navy">{orderNumber}</span>. A confirmation
          email is on its way.
        </p>
        {order ? (
          <div className="mt-3 flex justify-center">
            <OrderStatusBadge status={order.orderStatus} />
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
        <Button asChild variant="outline" size="sm">
          <a
            href={whatsappLink(
              CONTACT.whatsappDigits,
              `Hello Fast Traders, I have just placed order ${orderNumber}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            Message us about this order
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>

      <div className="mt-10">
        {lookup.isPending ? (
          <Skeleton className="h-72 w-full" />
        ) : lookup.isError || !order ? (
          <Alert variant="info" title="Order placed">
            We could not load the full details on this device. Use{' '}
            <Link href="/track-order" className="font-medium">
              track your order
            </Link>{' '}
            with <span className="font-mono">{orderNumber}</span> and the email you checked out
            with, or call us on {CONTACT.mobile}.
          </Alert>
        ) : (
          <OrderDetail order={order} />
        )}
      </div>
    </div>
  );
}
