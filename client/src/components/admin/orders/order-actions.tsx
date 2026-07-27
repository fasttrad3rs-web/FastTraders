'use client';

import { useState } from 'react';
import { Mail, Printer, Save, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { ConfirmDialog } from '@/components/admin/primitives';
import { useOrderMutations } from '@/lib/api/admin';
import { env } from '@/lib/env';
import type { OrderResponse } from '@/lib/api/cart.types';

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'] as const;

/** Status changer, dispatch, payment and document actions for one order. */
export function OrderActions({ order }: { order: OrderResponse }): JSX.Element {
  const mutations = useOrderMutations(order.id);

  const [status, setStatus] = useState(order.orderStatus);
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [courier, setCourier] = useState(order.courier ?? '');
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const [confirming, setConfirming] = useState(false);

  const destructive = status === 'cancelled' || status === 'returned';
  const invoiceHref = `${env.NEXT_PUBLIC_API_URL}/admin/orders/${order.id}/invoice`;

  const applyStatus = (): void => {
    mutations.status.mutate(
      { status, note: note || undefined, notifyCustomer: notify },
      {
        onSuccess: () => {
          setNote('');
          toast.success(`Order is now ${status}`, {
            description: notify ? 'The customer has been emailed.' : 'No email sent.',
          });
        },
        onError: (error) => toast.error('Could not update status', { description: error.message }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Change status
        </h2>

        <div className="mt-3 space-y-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Order status"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note — appears in the order history and the customer's email."
            aria-label="Status note"
            rows={2}
          />

          <div className="flex items-center gap-2.5">
            <Checkbox id="notify" checked={notify} onCheckedChange={(checked) => setNotify(checked === true)} />
            <Label htmlFor="notify" className="font-normal">Email the customer about this change</Label>
          </div>

          {destructive ? (
            <Alert variant="warning" className="text-xs">
              Moving to <strong>{status}</strong> returns reserved stock to inventory. This only fires
              on the transition, so it cannot double-count.
            </Alert>
          ) : null}

          <Button
            variant={destructive ? 'danger' : 'cta'}
            block
            disabled={status === order.orderStatus}
            isLoading={mutations.status.isPending}
            onClick={() => (destructive ? setConfirming(true) : applyStatus())}
          >
            <Save />
            {status === order.orderStatus ? 'No change to apply' : `Mark as ${status}`}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">Dispatch</h2>
        <div className="mt-3 space-y-3">
          <Field label="Courier" htmlFor="courier">
            <Input id="courier" value={courier} onChange={(event) => setCourier(event.target.value)} placeholder="TCS, Leopards, M&P…" />
          </Field>
          <Field label="Tracking number" htmlFor="tracking">
            <Input id="tracking" value={tracking} onChange={(event) => setTracking(event.target.value)} className="font-mono" />
          </Field>
          <Button
            variant="outline"
            block
            isLoading={mutations.tracking.isPending}
            onClick={() =>
              mutations.tracking.mutate(
                { courier, trackingNumber: tracking, markShipped: order.orderStatus !== 'shipped' },
                {
                  onSuccess: () => toast.success('Tracking saved and customer notified'),
                  onError: (error) => toast.error('Could not save', { description: error.message }),
                },
              )
            }
          >
            <Truck />
            Save tracking{order.orderStatus !== 'shipped' ? ' & mark shipped' : ''}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">Payment</h2>
        <div className="mt-3 space-y-2">
          {(['paid', 'pending', 'failed', 'refunded'] as const).map((value) => (
            <Button
              key={value}
              variant={order.paymentStatus === value ? 'primary' : 'outline'}
              size="sm"
              block
              disabled={order.paymentStatus === value}
              onClick={() =>
                mutations.payment.mutate(
                  { paymentStatus: value },
                  {
                    onSuccess: () => toast.success(`Payment marked ${value}`),
                    onError: (error) => toast.error('Could not update', { description: error.message }),
                  },
                )
              }
            >
              Mark {value}
            </Button>
          ))}
          <p className="pt-1 text-2xs text-muted-foreground">
            Marking a pending order as paid also confirms it.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">Documents</h2>
        <div className="mt-3 space-y-2">
          <Button asChild variant="outline" size="sm" block>
            <a href={invoiceHref} target="_blank" rel="noopener noreferrer">
              <Printer />
              Print invoice (PDF)
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm" block>
            <a href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Your Fast Traders order ${order.orderNumber}`)}`}>
              <Mail />
              Email the customer
            </a>
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Mark this order ${status}?`}
        description="Reserved stock will be returned to inventory, and the customer notified if the email option is ticked."
        confirmLabel={`Yes, mark ${status}`}
        destructive
        isLoading={mutations.status.isPending}
        onConfirm={applyStatus}
      />
    </div>
  );
}
