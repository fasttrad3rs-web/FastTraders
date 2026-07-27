'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { OrderDetail } from '@/components/order/order-detail';
import { useTrackOrder } from '@/lib/api/mutations';
import { trackOrderSchema } from '@/lib/forms';
import { CONTACT } from '@/lib/constants';

type TrackInput = z.infer<typeof trackOrderSchema>;

/**
 * Guest order lookup.
 *
 * Requires the order number *and* the checkout email, which is what stops
 * order numbers being enumerable by anyone who guesses the format.
 */
export default function TrackOrderPage(): JSX.Element {
  const lookup = useTrackOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackInput>({ resolver: zodResolver(trackOrderSchema) });

  const onSubmit = handleSubmit((values) => lookup.mutate(values));

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Track an order' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Track Your Order
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Enter your order number and the email address you used at checkout. No account needed.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 grid max-w-2xl gap-4 rounded-lg border border-border bg-white p-6 sm:grid-cols-2"
      >
        <Field label="Order number" htmlFor="track-number" required error={errors.orderNumber?.message}>
          <Input
            id="track-number"
            placeholder="FT-202607-0001"
            className="font-mono"
            {...register('orderNumber')}
            hasError={Boolean(errors.orderNumber)}
          />
        </Field>

        <Field label="Email" htmlFor="track-email" required error={errors.email?.message}>
          <Input id="track-email" type="email" {...register('email')} hasError={Boolean(errors.email)} />
        </Field>

        <div className="sm:col-span-2">
          <Button type="submit" variant="cta" isLoading={lookup.isPending} loadingText="Looking up…">
            <Search />
            Find my order
          </Button>
        </div>
      </form>

      {lookup.isError ? (
        <Alert variant="danger" title="No matching order" className="mt-6 max-w-2xl">
          Check the order number and email, or call us on {CONTACT.mobile} and we will look it up
          for you.
        </Alert>
      ) : null}

      {lookup.data ? (
        <div className="mt-8">
          <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
            Order {lookup.data.orderNumber}
          </h2>
          <OrderDetail order={lookup.data} />
        </div>
      ) : null}
    </div>
  );
}
