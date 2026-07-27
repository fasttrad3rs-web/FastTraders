'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionHeading } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/feedback';
import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/types';

/** Featured carousel and the New Arrivals / Best Sellers tab pair. */

/**
 * Horizontal scroller.
 * CSS scroll-snap rather than a JS carousel — it costs nothing, works without
 * hydration, and behaves like a native swipe on a phone.
 */
export function FeaturedCarousel({ products }: { products: Product[] }): JSX.Element | null {
  if (products.length === 0) return null;

  return (
    <section className="container py-14">
      <SectionHeading
        title="Featured Products"
        description="Fast movers and current stock highlights."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/products?isFeatured=true">
              See all
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
        {products.map((product, index) => (
          <li key={product.id} className="w-[62vw] shrink-0 snap-start sm:w-64 lg:w-72">
            <ProductCard product={product} priority={index < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ArrivalsAndBestSellers({
  newArrivals,
  bestSellers,
}: {
  newArrivals: Product[];
  bestSellers: Product[];
}): JSX.Element | null {
  if (newArrivals.length === 0 && bestSellers.length === 0) return null;

  return (
    <section className="border-y border-border bg-white py-14">
      <div className="container">
        <Tabs defaultValue="new">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy sm:text-2xl">
                Latest &amp; Popular
              </h2>
              <span className="mt-2 block h-1 w-12 rounded-full bg-brand-cyan" aria-hidden />
            </div>
            <TabsList className="w-auto">
              <TabsTrigger value="new">New Arrivals</TabsTrigger>
              <TabsTrigger value="best">Best Sellers</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="new">
            <ProductGrid products={newArrivals} emptyLabel="No new arrivals just yet." />
          </TabsContent>
          <TabsContent value="best">
            <ProductGrid products={bestSellers} emptyLabel="No sales data yet." />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function ProductGrid({
  products,
  emptyLabel,
}: {
  products: Product[];
  emptyLabel: string;
}): JSX.Element {
  if (products.length === 0) {
    return <EmptyState title={emptyLabel} description="Check back shortly, or browse the full catalogue." />;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.slice(0, 8).map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
