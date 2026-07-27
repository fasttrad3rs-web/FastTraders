'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Lock, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { OrderSummary } from '@/components/checkout/order-summary';
import { CheckoutSteps, ReviewRow } from '@/components/checkout/steps';
import { useCart, useCreateOrder } from '@/lib/api/mutations';
import { useAuth } from '@/lib/auth-context';
import { checkoutSchema, type CheckoutInput } from '@/lib/forms';
import { cn, formatPKR } from '@/lib/utils';

const STEPS = ['Contact', 'Shipping', 'Payment', 'Review'] as const;

/**
 * Four-step checkout. Guests are welcome — the API accepts an order with a
 * null user, and the customer block is all we need to fulfil it.
 */
export default function CheckoutPage(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cart, isPending } = useCart('shopping');
  const createOrder = useCreateOrder();
  const [step, setStep] = useState(0);

  const form = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: {
      customer: {
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        companyName: user?.companyName ?? '',
      },
      shippingAddress: { label: 'Delivery', line1: '', city: '', province: 'Punjab', isDefault: false },
      sameAsBilling: true,
      paymentMethod: 'cod',
    },
  });

  const { handleSubmit, watch, trigger } = form;
  const paymentMethod = watch('paymentMethod');

  /** Validate only the fields belonging to the current step before advancing. */
  const next = async (): Promise<void> => {
    const fields: Record<number, (keyof CheckoutInput | `customer.${string}` | `shippingAddress.${string}`)[]> = {
      0: ['customer.name', 'customer.email', 'customer.phone'],
      1: ['shippingAddress.line1', 'shippingAddress.city', 'shippingAddress.province'],
      2: ['paymentMethod'],
    };

    const valid = await trigger(fields[step] as never);
    if (valid) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const order = await createOrder.mutateAsync({
        ...values,
        ...(values.sameAsBilling ? { billingAddress: undefined } : {}),
      });
      toast.success(`Order ${order.orderNumber} placed`);
      router.push(`/order-confirmation/${order.orderNumber}`);
    } catch (error) {
      toast.error('Could not place your order', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  });

  if (isPending) {
    return (
      <div className="container grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Nothing to check out"
          description="Your cart is empty."
          icon={<ShoppingCart />}
          action={
            <Button asChild variant="cta">
              <Link href="/products">Browse the catalogue</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Checkout
      </h1>

      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Checkout progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                index === step
                  ? 'border-brand-cyan bg-brand-cyan/10 text-brand-navy'
                  : index < step
                    ? 'border-success/30 bg-success/5 text-success'
                    : 'border-border bg-white text-muted-foreground',
              )}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-current/10">
                {index < step ? <Check className="size-3" /> : index + 1}
              </span>
              {label}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="rounded-lg border border-border bg-white p-6">
          <CheckoutSteps step={step} form={form} isSignedIn={Boolean(user)} settings={null} />

          {step === 3 ? (
            <div className="space-y-5">
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                Review &amp; place order
              </h2>

              <dl className="space-y-3 text-sm">
                <ReviewRow label="Contact" onEdit={() => setStep(0)}>
                  {watch('customer.name')} · {watch('customer.email')} · {watch('customer.phone')}
                </ReviewRow>
                <ReviewRow label="Deliver to" onEdit={() => setStep(1)}>
                  {watch('shippingAddress.line1')}
                  {watch('shippingAddress.line2') ? `, ${watch('shippingAddress.line2')}` : ''},{' '}
                  {watch('shippingAddress.city')}, {watch('shippingAddress.province')}
                </ReviewRow>
                <ReviewRow label="Payment" onEdit={() => setStep(2)}>
                  {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Card (Stripe)'}
                </ReviewRow>
              </dl>

              <Alert variant="info" className="text-xs">
                Totals shown are estimates. Delivery and any discount are calculated by our system
                from the delivery city and coupon when the order is placed — the confirmed total is
                on your confirmation page and email.
              </Alert>

              <Button
                type="submit"
                variant="cta"
                size="lg"
                block
                isLoading={createOrder.isPending}
                loadingText="Placing order…"
              >
                <Lock />
                Place order · {formatPKR(cart.estimatedTotal)}
              </Button>
            </div>
          ) : null}

          <div className="mt-6 flex justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={step === 0}
            >
              <ArrowLeft />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" variant="primary" onClick={() => void next()}>
                Continue
                <ArrowRight />
              </Button>
            ) : null}
          </div>
        </form>

        <OrderSummary cart={cart} />
      </div>
    </div>
  );
}
