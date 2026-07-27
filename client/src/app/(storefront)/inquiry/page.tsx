'use client';

import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { CartLines } from '@/components/cart/cart-lines';
import { useCart, useCartMutations } from '@/lib/api/mutations';

/**
 * Inquiry list — the RFQ side of the hybrid model.
 *
 * Deliberately shows no prices: nothing here has been quoted yet, and showing
 * a retail figure next to a "request a price" flow would confuse a trade buyer.
 */
export default function InquiryPage(): JSX.Element {
  const { data: cart, isPending, isError, refetch } = useCart('inquiry');
  const mutations = useCartMutations('inquiry');

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Inquiry list' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Inquiry List
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Build the list, add any requirements per line, then send it. We come back with one
        consolidated quotation — usually within a working day.
      </p>

      {isError ? (
        <ErrorState className="mt-6" onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : cart.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Your inquiry list is empty"
          description="Add quote-only products, or use the “Bulk / trade price?” button on any priced product."
          icon={<FileText />}
          action={
            <Button asChild variant="cta">
              <Link href="/products?pricingMode=quote">
                Browse quote-only products
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <CartLines items={cart.items} mutations={mutations} showNote />

          <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Ready to send?
            </h2>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Lines</dt>
                <dd className="font-semibold">{cart.lineCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total quantity</dt>
                <dd className="font-semibold">{cart.itemCount}</dd>
              </div>
            </dl>

            <Alert variant="info" className="mt-4 text-xs">
              No prices are shown here — that is what the quotation is for.
            </Alert>

            <Button asChild variant="cta" size="lg" block className="mt-5">
              <Link href="/request-quote">
                Submit RFQ
                <ArrowRight />
              </Link>
            </Button>

            <Button asChild variant="ghost" size="sm" block className="mt-2">
              <Link href="/products">Add more items</Link>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
