'use client';

import { useState } from 'react';
import { FileText, MessageCircle, ShoppingCart, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/commerce';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { CONTACT } from '@/lib/constants';
import { useCartStore } from '@/store/cart-store';
import { whatsappLink } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * The hybrid-commerce control panel.
 *
 *   retail -> quantity + Add to Cart + Buy Now
 *   quote  -> quantity + note + Request Quote
 *   both   -> all of the above
 *
 * WhatsApp is always offered with the product name and SKU pre-filled — for a
 * lot of Pakistani trade buyers that is the preferred channel.
 */
export function ProductActions({ product }: { product: Product }): JSX.Element {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);
  const addToInquiry = useCartStore((state) => state.addToInquiry);

  const [qty, setQty] = useState(product.minOrderQty);
  const [note, setNote] = useState('');

  const buyable = product.pricingMode !== 'quote';
  const quotable = product.pricingMode !== 'retail';
  const soldOut = product.stock <= 0;

  const line = {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
    unit: product.unit,
    qty,
  };

  const onAddToCart = (): void => {
    addToCart({ ...line, ...(typeof product.price === 'number' ? { price: product.price } : {}) });
    toast.success('Added to cart', { description: `${qty} × ${product.name}` });
  };

  const onRequestQuote = (): void => {
    addToInquiry({ ...line, ...(note ? { note } : {}) });
    setNote('');
    toast.success('Added to your inquiry list', {
      description: 'Send the list when you are ready and we will price it.',
      action: { label: 'View list', onClick: () => router.push('/inquiry') },
    });
  };

  const whatsappMessage = `Hello Fast Traders, I am interested in:\n${product.name}\nSKU: ${product.sku}${
    product.partNumber ? `\nPart no: ${product.partNumber}` : ''
  }\nQuantity: ${qty} ${product.unit}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={qty}
          onChange={setQty}
          min={product.minOrderQty}
          max={buyable && !soldOut ? Math.max(product.stock, product.minOrderQty) : 9999}
          unit={product.unit}
        />
        {product.minOrderQty > 1 ? (
          <span className="text-xs text-muted-foreground">
            Minimum order {product.minOrderQty} {product.unit}
          </span>
        ) : null}
      </div>

      {buyable ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="cta" size="lg" block onClick={onAddToCart} disabled={soldOut}>
            <ShoppingCart />
            {soldOut ? 'Out of stock' : 'Add to cart'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            block
            disabled={soldOut}
            onClick={() => {
              onAddToCart();
              router.push('/checkout');
            }}
          >
            <Zap />
            Buy now
          </Button>
        </div>
      ) : null}

      {quotable ? (
        <div id="request-quote" className="scroll-mt-28 rounded-lg border border-border bg-surface p-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            {buyable ? 'Need a bulk or trade price?' : 'Request a quotation'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add it to your inquiry list with any requirements and we will price it, usually within
            a working day.
          </p>

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Rating, poles, delivery date, or anything else we should know…"
            aria-label="Note for this quotation line"
            className="mt-3 min-h-[72px] bg-white"
          />

          <Button variant={buyable ? 'outline' : 'cta'} size="lg" block className="mt-3" onClick={onRequestQuote}>
            <FileText />
            {buyable ? 'Add to inquiry list' : 'Request quote'}
          </Button>
        </div>
      ) : null}

      <Button asChild variant="outline" size="lg" block className="border-[#25D366]/40 text-[#128C4B] hover:bg-[#25D366]/10">
        <a href={whatsappLink(CONTACT.whatsappDigits, whatsappMessage)} target="_blank" rel="noopener noreferrer">
          <MessageCircle />
          Ask on WhatsApp
        </a>
      </Button>
    </div>
  );
}
