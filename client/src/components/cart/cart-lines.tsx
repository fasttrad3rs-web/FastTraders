'use client';

import Link from 'next/link';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { QuantityStepper } from '@/components/ui/commerce';
import { Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/product/product-image';
import { formatPKR } from '@/lib/utils';
import type { CartMutationApi } from '@/lib/api/mutations';
import type { HydratedCartLine } from '@/lib/api/cart.types';

/**
 * Shared line-item list for both carts.
 *
 * `showNote` is the only real difference: an inquiry line carries a free-text
 * requirement ("3P, 36 kA, needed by the 20th") that becomes the RFQ line note.
 */
export function CartLines({
  items,
  mutations,
  showNote,
  showPrice,
}: {
  items: HydratedCartLine[];
  mutations: CartMutationApi;
  showNote?: boolean;
  showPrice?: boolean;
}): JSX.Element {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-white">
      {items.map((line) => (
        <li key={`${line.product}-${line.variant ?? ''}`} className="p-4">
          <div className="flex gap-4">
            <Link href={`/products/${line.slug}`} className="shrink-0">
              <ProductImage
                image={
                  line.image
                    ? { url: line.image, publicId: 'cart', alt: line.name, isPrimary: true }
                    : undefined
                }
                sku={line.sku}
                sizes="96px"
                className="size-24 rounded-md border border-border"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.slug}`}
                    className="line-clamp-2 text-sm font-semibold text-foreground hover:text-brand-cyan"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{line.sku}</p>
                </div>

                <button
                  type="button"
                  onClick={() => mutations.remove.mutate(line.product)}
                  disabled={mutations.remove.isPending}
                  aria-label={`Remove ${line.name}`}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {!line.isAvailable ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  {line.stock <= 0 ? 'Out of stock' : `Only ${line.stock} available`}
                </p>
              ) : null}

              {line.priceChanged ? (
                <p className="mt-2 text-xs font-medium text-warning">
                  Price has changed since you added this item.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <QuantityStepper
                  value={line.qty}
                  min={line.minOrderQty}
                  max={showPrice ? Math.max(line.stock, line.minOrderQty) : 9999}
                  unit={line.unit}
                  disabled={mutations.update.isPending}
                  onChange={(qty) => mutations.update.mutate({ productId: line.product, qty })}
                />

                {showPrice ? (
                  <div className="text-right">
                    <p className="font-heading text-base font-bold tabular-nums text-brand-navy">
                      {typeof line.subtotal === 'number' ? formatPKR(line.subtotal) : '—'}
                    </p>
                    {typeof line.price === 'number' ? (
                      <p className="text-2xs text-muted-foreground">
                        {formatPKR(line.price)} / {line.unit}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {showNote ? (
                <div className="mt-3">
                  <label
                    htmlFor={`note-${line.product}`}
                    className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Requirements for this line
                  </label>
                  <Textarea
                    id={`note-${line.product}`}
                    defaultValue={line.note ?? ''}
                    placeholder="Rating, poles, breaking capacity, delivery date…"
                    className="mt-1 min-h-[60px] text-sm"
                    onBlur={(event) => {
                      if (event.target.value !== (line.note ?? '')) {
                        mutations.update.mutate({ productId: line.product, note: event.target.value });
                      }
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </li>
      ))}

      <li className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutations.clear.mutate()}
          isLoading={mutations.clear.isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
          Empty this list
        </Button>
      </li>
    </ul>
  );
}
