'use client';

import Link from 'next/link';
import type { UseFormReturn } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROVINCES } from '@/types/user.types';
import type { CheckoutInput } from '@/lib/forms';
import type { Setting } from '@/types';
import { PaymentMethods, type PaymentMethod } from './payment-methods';

/**
 * Checkout steps 1–3. The review step stays in the page, next to the submit
 * button, so the form's own state does not have to cross another boundary.
 */
export function CheckoutSteps({
  step,
  form,
  isSignedIn,
  settings,
}: {
  step: number;
  form: UseFormReturn<CheckoutInput>;
  isSignedIn: boolean;
  settings: Setting | null;
}): JSX.Element | null {
  const { register, watch, setValue, formState } = form;
  const { errors } = formState;

  if (step === 0) {
    return (
      <fieldset className="space-y-4">
        <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Contact details
        </legend>

        {!isSignedIn ? (
          <Alert variant="info" className="text-xs">
            Checking out as a guest.{' '}
            <Link href="/login?next=/checkout" className="font-medium">
              Sign in
            </Link>{' '}
            to save this order to your account.
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="co-name" required error={errors.customer?.name?.message}>
            <Input id="co-name" {...register('customer.name')} hasError={Boolean(errors.customer?.name)} />
          </Field>
          <Field label="Company" htmlFor="co-company">
            <Input id="co-company" {...register('customer.companyName')} />
          </Field>
          <Field label="Email" htmlFor="co-email" required error={errors.customer?.email?.message}>
            <Input
              id="co-email"
              type="email"
              {...register('customer.email')}
              hasError={Boolean(errors.customer?.email)}
            />
          </Field>
          <Field label="Phone" htmlFor="co-phone" required error={errors.customer?.phone?.message}>
            <Input
              id="co-phone"
              type="tel"
              placeholder="0300 1234567"
              {...register('customer.phone')}
              hasError={Boolean(errors.customer?.phone)}
            />
          </Field>
        </div>
      </fieldset>
    );
  }

  if (step === 1) {
    return (
      <fieldset className="space-y-4">
        <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Delivery address
        </legend>

        <Field label="Address line 1" htmlFor="co-line1" required error={errors.shippingAddress?.line1?.message}>
          <Input
            id="co-line1"
            {...register('shippingAddress.line1')}
            hasError={Boolean(errors.shippingAddress?.line1)}
          />
        </Field>

        <Field label="Address line 2" htmlFor="co-line2">
          <Input id="co-line2" {...register('shippingAddress.line2')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="co-city" required error={errors.shippingAddress?.city?.message}>
            <Input
              id="co-city"
              placeholder="Lahore"
              {...register('shippingAddress.city')}
              hasError={Boolean(errors.shippingAddress?.city)}
            />
          </Field>

          <Field label="Province" htmlFor="co-province" required error={errors.shippingAddress?.province?.message}>
            <Select
              value={watch('shippingAddress.province')}
              onValueChange={(value) =>
                setValue('shippingAddress.province', value as (typeof PROVINCES)[number])
              }
            >
              <SelectTrigger id="co-province">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Postal code" htmlFor="co-postal">
            <Input id="co-postal" {...register('shippingAddress.postalCode')} />
          </Field>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Checkbox
            id="co-same"
            checked={watch('sameAsBilling')}
            onCheckedChange={(checked) => setValue('sameAsBilling', checked === true)}
          />
          <Label htmlFor="co-same" className="font-normal">
            Billing address is the same as delivery
          </Label>
        </div>

        <Field label="Delivery notes" htmlFor="co-notes" hint="Gate timings, site contact, anything else.">
          <Textarea id="co-notes" rows={3} {...register('notes')} />
        </Field>
      </fieldset>
    );
  }

  if (step === 2) {
    return (
      <fieldset className="space-y-4">
        <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Payment method
        </legend>

        <PaymentMethods
          value={watch('paymentMethod')}
          onChange={(value: PaymentMethod) => setValue('paymentMethod', value)}
          settings={settings}
        />

        <Field
          label="Coupon code"
          htmlFor="co-coupon"
          hint="Validated by our system when the order is placed."
        >
          <Input id="co-coupon" placeholder="TRADE5" {...register('couponCode')} />
        </Field>
      </fieldset>
    );
  }

  return null;
}

/** Summary row on the review step, with a jump-back link. */
export function ReviewRow({
  label,
  children,
  onEdit,
}: {
  label: string;
  children: React.ReactNode;
  onEdit: () => void;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <dt className="text-2xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-foreground">{children}</dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-medium text-brand-cyan hover:underline"
      >
        Edit
      </button>
    </div>
  );
}
