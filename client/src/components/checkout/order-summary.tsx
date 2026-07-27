import Link from 'next/link';
import { formatPKR } from '@/lib/utils';
import type { CartSummary } from '@/lib/api/cart.types';

/**
 * Checkout sidebar.
 *
 * Delivery and coupon are marked "calculated at checkout" until the server
 * prices the order — those figures come from Settings shipping rules and the
 * coupon record, never from the client.
 */
export function OrderSummary({
  cart,
  shippingLabel,
}: {
  cart: CartSummary;
  shippingLabel?: string;
}): JSX.Element {
  return (
    <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
      <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        Order summary
      </h2>

      <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
        {cart.items.map((line) => (
          <li key={line.product} className="flex gap-3 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-brand-navy text-2xs font-bold text-white">
              {line.qty}
            </span>
            <span className="min-w-0 flex-1">
              <Link href={`/products/${line.slug}`} className="line-clamp-2 hover:text-brand-cyan">
                {line.name}
              </Link>
              <span className="block font-mono text-2xs text-muted-foreground">{line.sku}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">
              {typeof line.subtotal === 'number' ? formatPKR(line.subtotal) : '—'}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-semibold tabular-nums">{formatPKR(cart.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Sales tax</dt>
          <dd className="font-semibold tabular-nums">{formatPKR(cart.taxAmount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="text-xs text-muted-foreground">{shippingLabel ?? 'Calculated on review'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-between border-t border-border pt-4">
        <span className="font-heading font-bold text-brand-navy">Estimated total</span>
        <span className="font-heading text-lg font-bold tabular-nums text-brand-navy">
          {formatPKR(cart.estimatedTotal)}
        </span>
      </div>

      <p className="mt-3 text-2xs text-muted-foreground">
        Final delivery charge and any discount are confirmed by our system when the order is placed.
      </p>
    </aside>
  );
}
