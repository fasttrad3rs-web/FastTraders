'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingCart, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { CartLines } from '@/components/cart/cart-lines';
import { useCart, useCartMutations } from '@/lib/api/mutations';
import { formatPKR } from '@/lib/utils';

/**
 * Shopping cart.
 *
 * Client-rendered on purpose — it is per-visitor, never cacheable and blocked
 * in robots.txt, so there is nothing for a Server Component to gain here.
 */
export default function CartPage(): JSX.Element {
  const { data: cart, isPending, isError, refetch } = useCart('shopping');
  const mutations = useCartMutations('shopping');

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Cart' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Shopping Cart
      </h1>

      {isError ? (
        <ErrorState className="mt-6" onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : cart.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Your cart is empty"
          description="Priced items you add will appear here. Quote-only products go to your inquiry list instead."
          icon={<ShoppingCart />}
          action={
            <Button asChild variant="cta">
              <Link href="/products">
                Browse the catalogue
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            {cart.hasIssues ? (
              <Alert variant="warning" title="Please review your cart">
                One or more items are out of stock or have changed price. Adjust them before
                checking out.
              </Alert>
            ) : null}

            <CartLines items={cart.items} mutations={mutations} showPrice />
          </div>

          <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Order summary
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})
                </dt>
                <dd className="font-semibold tabular-nums">{formatPKR(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Estimated sales tax</dt>
                <dd className="font-semibold tabular-nums">{formatPKR(cart.taxAmount)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Delivery</dt>
                <dd className="text-xs">Calculated at checkout</dd>
              </div>
            </dl>

            <div className="mt-4 flex justify-between border-t border-border pt-4">
              <span className="font-heading font-bold text-brand-navy">Estimated total</span>
              <span className="font-heading text-lg font-bold tabular-nums text-brand-navy">
                {formatPKR(cart.estimatedTotal)}
              </span>
            </div>

            <p className="mt-2 text-2xs text-muted-foreground">
              Coupon codes are applied at checkout, once we know the delivery city.
            </p>

            <Button asChild variant="cta" size="lg" block className="mt-5" disabled={cart.hasIssues}>
              <Link href="/checkout">
                Proceed to checkout
                <ArrowRight />
              </Link>
            </Button>

            <Button asChild variant="ghost" size="sm" block className="mt-2">
              <Link href="/products">Continue shopping</Link>
            </Button>

            <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-2xs text-muted-foreground">
              <Truck className="mt-0.5 size-3.5 shrink-0 text-brand-cyan" aria-hidden />
              Same-day collection from Grace Tower, Bull Road. Delivery across Pakistan in 1–6
              working days.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
