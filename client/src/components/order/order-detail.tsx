import Link from 'next/link';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatPKR } from '@/lib/utils';
import type { OrderResponse } from '@/lib/api/cart.types';

/** Shared order presentation used by confirmation, tracking and the account. */

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
  pending: 'warning',
  confirmed: 'default',
  processing: 'default',
  shipped: 'default',
  delivered: 'success',
  cancelled: 'danger',
  returned: 'muted',
};

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  stripe: 'Card (Stripe)',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

/** Fulfilment stages, in order. Cancelled and returned sit outside this path. */
const TIMELINE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;

export function OrderStatusBadge({ status }: { status: string }): JSX.Element {
  return <Badge variant={STATUS_VARIANT[status] ?? 'muted'}>{status.replace('_', ' ')}</Badge>;
}

export function OrderTimeline({ order }: { order: OrderResponse }): JSX.Element | null {
  const current = TIMELINE.indexOf(order.orderStatus as (typeof TIMELINE)[number]);
  if (current === -1) return null;

  return (
    <ol className="flex flex-wrap gap-2" aria-label="Order progress">
      {TIMELINE.map((stage, index) => (
        <li
          key={stage}
          className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold capitalize ${
            index <= current
              ? 'border-success/30 bg-success/5 text-success'
              : 'border-border bg-white text-muted-foreground'
          }`}
          aria-current={index === current ? 'step' : undefined}
        >
          {index <= current ? <CheckCircle2 className="size-3.5 shrink-0" aria-hidden /> : null}
          {stage}
        </li>
      ))}
    </ol>
  );
}

export function OrderDetail({ order }: { order: OrderResponse }): JSX.Element {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <OrderTimeline order={order} />

        <div className="rounded-lg border border-border bg-white">
          <h2 className="border-b border-border px-5 py-3 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Items
          </h2>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.sku} className="flex items-start gap-3 px-5 py-3 text-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded bg-brand-navy text-2xs font-bold text-white">
                  {item.qty}
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={`/products/${item.product}`} className="line-clamp-2 hover:text-brand-cyan">
                    {item.name}
                  </Link>
                  <span className="mt-0.5 block font-mono text-2xs text-muted-foreground">
                    {item.sku} · {formatPKR(item.price)} / {item.unit}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatPKR(item.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        {order.trackingNumber ? (
          <div className="flex items-start gap-3 rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 p-4 text-sm">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div>
              <p className="font-semibold text-brand-navy">On its way</p>
              <p className="mt-0.5 text-muted-foreground">
                {order.courier ? `${order.courier} · ` : ''}
                Tracking <span className="font-mono font-medium">{order.trackingNumber}</span>
              </p>
            </div>
          </div>
        ) : null}

        {order.statusHistory.length > 0 ? (
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              History
            </h2>
            <ol className="mt-3 space-y-2.5">
              {order.statusHistory.map((entry, index) => (
                // eslint-disable-next-line react/no-array-index-key -- history is append-only
                <li key={index} className="flex gap-3 text-sm">
                  <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="font-medium capitalize text-foreground">{entry.status}</p>
                    {entry.note ? <p className="text-xs text-muted-foreground">{entry.note}</p> : null}
                    <p className="text-2xs text-muted-foreground">{formatDate(entry.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Summary
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={formatPKR(order.subtotal)} />
            {order.discount > 0 ? (
              <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`- ${formatPKR(order.discount)}`} />
            ) : null}
            <Row label="Sales tax" value={formatPKR(order.taxAmount)} />
            <Row label="Delivery" value={order.shippingCost > 0 ? formatPKR(order.shippingCost) : 'Free'} />
          </dl>
          <div className="mt-4 flex justify-between border-t border-border pt-4">
            <span className="font-heading font-bold text-brand-navy">Total</span>
            <span className="font-heading text-lg font-bold tabular-nums text-brand-navy">
              {formatPKR(order.total)}
            </span>
          </div>
          <p className="mt-3 text-2xs text-muted-foreground">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod} ·{' '}
            <span className="capitalize">{order.paymentStatus}</span>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 text-sm">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Delivery to
          </h2>
          <address className="mt-3 not-italic text-muted-foreground">
            <span className="block font-medium text-foreground">{order.customer.name}</span>
            {order.customer.companyName ? <span className="block">{order.customer.companyName}</span> : null}
            <span className="block">{String(order.shippingAddress.line1 ?? '')}</span>
            {order.shippingAddress.line2 ? <span className="block">{String(order.shippingAddress.line2)}</span> : null}
            <span className="block">
              {String(order.shippingAddress.city ?? '')}, {String(order.shippingAddress.province ?? '')}
            </span>
            <span className="mt-2 block">{order.customer.phone}</span>
            <span className="block">{order.customer.email}</span>
          </address>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
