'use client';

import Link from 'next/link';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { QuantityStepper } from '@/components/ui/commerce';
import { Textarea } from '@/components/ui/input';
import { AvailabilityBadge, CallButton, SourcingCTA, WhatsAppButton } from '@/components/shared';
import { ProductImage } from '@/components/product/product-image';
import { useInquiryStore } from '@/store/inquiry-store';

/**
 * The inquiry list.
 *
 * Reads straight from the store, not the server. It is a shortlist held in
 * localStorage, so it renders instantly, survives a dropped cookie, and works
 * with no network at all — which on a Lahore 3G connection matters more than
 * server authority does. The items are sent with the inquiry on submission.
 *
 * No prices anywhere, and no total. There is nothing to total.
 */
export default function InquiryListPage(): JSX.Element {
  const items = useInquiryStore((state) => state.items);
  const hydrated = useInquiryStore((state) => state.hydrated);
  const updateQty = useInquiryStore((state) => state.updateQty);
  const updateNote = useInquiryStore((state) => state.updateNote);
  const remove = useInquiryStore((state) => state.remove);
  const clear = useInquiryStore((state) => state.clear);

  if (!hydrated) {
    return (
      <div className="container py-10">
        <div className="h-64 animate-pulse rounded-lg bg-surface" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-10">
        <Breadcrumb items={[{ label: 'Inquiry list' }]} className="mb-4" />
        <EmptyState
          title="Your inquiry list is empty"
          description="Add the parts you need and send them in one go — we will come back with a price for the lot."
          action={
            <Button asChild variant="cta">
              <Link href="/products">Browse the catalogue</Link>
            </Button>
          }
        />

        {/* Empty because we do not stock it, as often as because they have not
            started yet. Both roads lead here. */}
        <SourcingCTA variant="panel" className="mt-8" />
      </div>
    );
  }

  const discontinued = items.filter((item) => item.availability === 'discontinued');

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Inquiry list' }]} className="mb-4" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-tight text-brand-navy">
            Your Inquiry List
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} product{items.length === 1 ? '' : 's'} — send them together and we will
            quote the whole list.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={clear}>
          <Trash2 />
          Clear list
        </Button>
      </div>

      {discontinued.length > 0 ? (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
          {discontinued.length} item{discontinued.length === 1 ? ' is' : 's are'} discontinued. We
          can usually suggest a replacement — leave {discontinued.length === 1 ? 'it' : 'them'} on
          the list and ask.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex flex-wrap gap-4 rounded-lg border border-border bg-white p-4"
            >
              <Link
                href={`/products/${item.slug}`}
                className="size-20 shrink-0 overflow-hidden rounded border border-border"
              >
                <ProductImage sku={item.sku} sizes="80px" className="size-full" />
              </Link>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {item.brand ? (
                      <p className="text-2xs font-bold uppercase tracking-wide text-brand-cyan">
                        {item.brand}
                      </p>
                    ) : null}
                    <Link
                      href={`/products/${item.slug}`}
                      className="block text-sm font-semibold text-foreground hover:text-brand-cyan"
                    >
                      {item.name}
                    </Link>
                    <p className="font-mono text-2xs text-muted-foreground">{item.sku}</p>
                  </div>

                  <AvailabilityBadge value={item.availability} size="sm" />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    value={item.qty}
                    onChange={(qty) => updateQty(item.productId, qty)}
                    min={1}
                  />
                  <span className="text-xs text-muted-foreground">{item.unit}</span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => remove(item.productId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </div>

                {/*
                  The per-line note is what makes a list worth sending. "3P,
                  36 kA, needed by the 20th" is the difference between a quote
                  and another phone call.
                */}
                <Textarea
                  rows={2}
                  placeholder="Anything specific? e.g. 3P, 36 kA, needed by the 20th"
                  value={item.note ?? ''}
                  onChange={(event) => updateNote(item.productId, event.target.value)}
                  aria-label={`Note for ${item.name}`}
                />
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-4 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-24">
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Ready to ask?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We will confirm availability and price for the whole list, usually within one working
              day.
            </p>
          </div>

          <Button asChild variant="cta" block>
            <Link href="/submit-inquiry">
              Send inquiry
              <ArrowRight />
            </Link>
          </Button>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-2xs uppercase tracking-wide text-muted-foreground">
              Or reach us directly
            </p>
            <WhatsAppButton items={items} label="Send this list on WhatsApp" block />
            <CallButton block buttonVariant="outline" context="inquiry_list" />
          </div>
        </aside>
      </div>

      {/* Something was missing from the list they just built. */}
      <SourcingCTA variant="panel" className="mt-10" />
    </div>
  );
}
