'use client';

import { useState } from 'react';
import { FileText, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockBadge } from '@/components/ui/badge';
import { PriceDisplay, QuantityStepper, Rating } from '@/components/ui/commerce';
import { SectionHeading } from '@/components/ui/separator';
import { mockProducts } from '@/lib/mock-data';

/**
 * Commerce primitives, shown against the three pricing modes so the hybrid
 * model is visible at a glance.
 */
export function CommerceSection(): JSX.Element {
  const [qty, setQty] = useState(2);
  const [rollQty, setRollQty] = useState(1);

  const samples = [
    { label: 'retail — priced, buyable', product: mockProducts[2] },
    { label: 'both — priced + bulk quote', product: mockProducts[0] },
    { label: 'quote — price hidden', product: mockProducts[1] },
  ];

  return (
    <section id="commerce" className="scroll-mt-24">
      <SectionHeading
        title="Commerce primitives"
        description="PriceDisplay adapts to pricingMode: a quote-only product shows the call to action, never an empty price."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {samples.map(({ label, product }) =>
          product ? (
            <div key={product.id} className="flex flex-col rounded-lg border border-border bg-white p-5">
              <p className="mb-3 font-mono text-2xs uppercase tracking-wide text-brand-cyan">{label}</p>

              <p className="text-sm font-semibold text-foreground">{product.name}</p>
              <p className="mt-1 font-mono text-2xs text-muted-foreground">
                {product.sku} · {product.brand}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <Rating value={product.ratingAvg} count={product.reviewCount} size="sm" />
                <StockBadge status={product.stockStatus} />
              </div>

              <div className="mt-4">
                <PriceDisplay
                  price={product.price}
                  comparePrice={product.comparePrice}
                  pricingMode={product.pricingMode}
                  unit={product.unit}
                />
              </div>

              <div className="mt-auto space-y-2 pt-5">
                {product.pricingMode !== 'quote' ? (
                  <Button variant="cta" block>
                    <ShoppingCart />
                    Add to cart
                  </Button>
                ) : null}
                {product.pricingMode !== 'retail' ? (
                  <Button variant={product.pricingMode === 'quote' ? 'cta' : 'outline'} block>
                    <FileText />
                    {product.pricingMode === 'quote' ? 'Request quote' : 'Bulk / trade price?'}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null,
        )}
      </div>

      <div className="mt-6 grid gap-6 rounded-lg border border-border bg-white p-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Quantity stepper
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <QuantityStepper value={qty} onChange={setQty} min={1} max={40} />
            <QuantityStepper value={rollQty} onChange={setRollQty} min={1} max={18} unit="rolls" />
            <QuantityStepper value={1} onChange={() => undefined} disabled />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Respects `minOrderQty` and available stock; typing is allowed and clamped.
          </p>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Ratings &amp; PKR formatting
          </p>
          <div className="space-y-3">
            <Rating value={4.6} count={12} />
            <Rating value={3.2} count={5} size="sm" />
            <Rating value={5} />
            <div className="flex flex-wrap items-baseline gap-6 pt-2">
              <PriceDisplay price={12500} pricingMode="retail" size="sm" />
              <PriceDisplay price={38500} comparePrice={44000} pricingMode="both" />
              <PriceDisplay price={1915420} pricingMode="retail" size="lg" />
            </div>
            <PriceDisplay pricingMode="quote" />
          </div>
        </div>
      </div>
    </section>
  );
}
