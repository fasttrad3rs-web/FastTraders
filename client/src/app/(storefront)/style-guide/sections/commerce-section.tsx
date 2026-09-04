'use client';

import { useState } from 'react';
import { FileText, MessageCircle, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvailabilityBadge } from '@/components/shared';
import { AvailabilityNote, QuantityStepper, Rating } from '@/components/ui/commerce';
import { SectionHeading } from '@/components/ui/separator';
import { mockProducts } from '@/lib/mock-data';

/**
 * Catalogue primitives.
 *
 * Fast Traders publishes no prices, so the slot where a price would sit
 * carries the call to action instead. Every product routes to a phone call,
 * WhatsApp, or the enquiry list.
 */
export function CommerceSection(): JSX.Element {
  const [qty, setQty] = useState(2);
  const [rollQty, setRollQty] = useState(1);

  const samples = [
    { label: 'stocked item', product: mockProducts[2] },
    { label: 'sourced to order', product: mockProducts[1] },
    { label: 'low stock', product: mockProducts[0] },
  ];

  return (
    <section id="commerce" className="scroll-mt-24">
      <SectionHeading
        title="Catalogue primitives"
        description="No prices anywhere. AvailabilityNote fills the price slot with the next step."
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
                <AvailabilityBadge value={product.availability} size="sm" />
              </div>

              <div className="mt-4">
                <AvailabilityNote isMadeToOrder={product.isMadeToOrder} size="sm" />
              </div>

              <div className="mt-auto space-y-2 pt-5">
                <Button variant="cta" block className="bg-[#25D366] hover:bg-[#1da851]">
                  <MessageCircle />
                  Ask on WhatsApp
                </Button>
                <Button variant="outline" block>
                  <FileText />
                  Add to enquiry list
                </Button>
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
            <QuantityStepper value={rollQty} onChange={setRollQty} min={1} unit="rolls" />
            <QuantityStepper value={1} onChange={() => undefined} disabled />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Quantity is an indication of interest on an enquiry, not an order line.
          </p>
        </div>

        <div>
          <p className="mb-3 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
            Availability &amp; ratings
          </p>
          <div className="space-y-4">
            <AvailabilityNote />
            <AvailabilityNote isMadeToOrder size="lg" />
            {/*
              Rating survives as a primitive for admin-entered testimonials.
              It no longer appears on product cards — nothing aggregates
              verified buyer reviews now that there are no customer accounts.
            */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Rating value={4.6} count={12} />
              <Badge variant="outline">Sourced to order</Badge>
            </div>
            <Button variant="primary" size="sm">
              <PhoneCall />
              Call +92 324 4234990
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
