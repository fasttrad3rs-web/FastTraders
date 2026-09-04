'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Send } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/feedback';
import { InquiryReceipt } from './inquiry-receipt';
import { InquirySummary } from './inquiry-summary';
import { useSubmitInquiry } from '@/lib/api/mutations';
import { submitInquirySchema, type SubmitInquiryFormValues } from '@/lib/forms';
import { trackInquirySubmitted } from '@/lib/analytics';
import { useInquiryStore } from '@/store/inquiry-store';
import { useFormToken } from '@/hooks/use-form-token';
import { HoneypotField } from '@/components/shared/honeypot-field';

/**
 * The inquiry form.
 *
 * Phone is the only required contact field. Email is optional and sits below
 * the fold of importance, because plenty of trade buyers here do not check
 * one — demanding an address as the price of asking loses the lead outright.
 *
 * The form posts the shortlist along with the details, so a browser that lost
 * its session cookie still sends the list the customer can see on screen.
 */
export function SubmitInquiryForm(): JSX.Element {
  const items = useInquiryStore((state) => state.items);
  const hydrated = useInquiryStore((state) => state.hydrated);
  const clear = useInquiryStore((state) => state.clear);

  const [receipt, setReceipt] = useState<{ inquiryNumber: string; itemCount: number } | null>(null);
  const submit = useSubmitInquiry();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubmitInquiryFormValues>({
    resolver: zodResolver(submitInquirySchema),
    defaultValues: { preferredContactMethod: 'phone', website: '' },
  });

  const preferred = watch('preferredContactMethod');
  const formToken = useFormToken();

  const onSubmit = handleSubmit((values) => {
    submit.mutate(
      {
        ...(formToken() ? { formToken: formToken() } : {}),
        customer: values.customer,
        items: items.map((item) => ({
          product: item.productId,
          qty: item.qty,
          ...(item.note ? { note: item.note } : {}),
        })),
        ...(values.message ? { message: values.message } : {}),
        preferredContactMethod: values.preferredContactMethod,
        ...(values.preferredContactTime
          ? { preferredContactTime: values.preferredContactTime }
          : {}),
        website: values.website ?? '',
      },
      {
        onSuccess: (data) => {
          trackInquirySubmitted({ type: 'product_inquiry', itemCount: items.length });
          // Cleared only after the server has confirmed. Wiping the list on
          // click would lose it on any network failure.
          clear();
          setReceipt(data);
        },
        onError: (error) => setError('root', { message: error.message }),
      },
    );
  });

  if (receipt) {
    return <InquiryReceipt inquiryNumber={receipt.inquiryNumber} itemCount={receipt.itemCount} />;
  }

  if (!hydrated) {
    return <div className="mt-6 h-96 animate-pulse rounded-lg bg-surface" />;
  }

  if (items.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="There is nothing on your list yet"
          description="Add the parts you need first, then send them to us in one go."
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
    <form onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
      <InquirySummary items={items} />

      {errors.root ? (
        <Alert variant="danger" title="Could not send your inquiry">
          {errors.root.message}
        </Alert>
      ) : null}

      {/* ------------------------------- Contact ------------------------- */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-white p-5">
        <legend className="px-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          How do we reach you?
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="name" required error={errors.customer?.name?.message}>
            <Input id="name" autoComplete="name" placeholder="Imran Sheikh" {...register('customer.name')} />
          </Field>

          <Field
            label="Mobile number"
            htmlFor="phone"
            required
            hint="We will call you on this."
            error={errors.customer?.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0300 1234567"
              {...register('customer.phone')}
            />
          </Field>

          <Field
            label="WhatsApp number"
            htmlFor="whatsapp"
            hint="Only if it differs from the number above."
            error={errors.customer?.whatsapp?.message}
          >
            <Input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              placeholder="0300 1234567"
              {...register('customer.whatsapp')}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="email"
            hint="Optional — for a written copy."
            error={errors.customer?.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register('customer.email')}
            />
          </Field>
        </div>
      </fieldset>

      {/* ------------------------------ Business ------------------------- */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-white p-5">
        <legend className="px-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          About your business
          <span className="ml-2 font-sans text-2xs font-normal normal-case text-muted-foreground">
            optional, but it helps us quote
          </span>
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Company" htmlFor="company" error={errors.customer?.company?.message}>
            <Input
              id="company"
              autoComplete="organization"
              placeholder="Kohinoor Textile Mills"
              {...register('customer.company')}
            />
          </Field>

          <Field label="Your role" htmlFor="designation" error={errors.customer?.designation?.message}>
            <Input
              id="designation"
              placeholder="Maintenance Manager"
              {...register('customer.designation')}
            />
          </Field>

          <Field label="City" htmlFor="city" error={errors.customer?.city?.message}>
            <Input
              id="city"
              autoComplete="address-level2"
              placeholder="Lahore"
              {...register('customer.city')}
            />
          </Field>
        </div>
      </fieldset>

      {/* ----------------------------- Preferences ----------------------- */}
      <fieldset className="space-y-4 rounded-lg border border-border bg-white p-5">
        <legend className="px-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          When suits you?
        </legend>

        <Field label="Preferred way to reach you" htmlFor="contact-method">
          <RadioGroup
            id="contact-method"
            value={preferred}
            onValueChange={(value) =>
              setValue('preferredContactMethod', value as SubmitInquiryFormValues['preferredContactMethod'])
            }
            className="flex flex-wrap gap-4"
          >
            {(
              [
                ['phone', 'Phone call'],
                ['whatsapp', 'WhatsApp'],
                ['email', 'Email'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={value} id={`method-${value}`} />
                {label}
              </label>
            ))}
          </RadioGroup>
        </Field>

        <Field
          label="Best time to call"
          htmlFor="contact-time"
          hint="Free text — “after 5pm”, “not during Jummah”, whatever suits."
          error={errors.preferredContactTime?.message}
        >
          <Input id="contact-time" placeholder="After 4pm" {...register('preferredContactTime')} />
        </Field>

        <Field
          label="Anything else we should know?"
          htmlFor="message"
          hint="Deadlines, the application, a bill of materials to match — all useful."
          error={errors.message?.message}
        >
          <Textarea
            id="message"
            rows={4}
            placeholder="Sub-panel upgrade for a loom shed. Site work starts on the 20th, so I need to know lead times before I commit."
            {...register('message')}
          />
        </Field>
      </fieldset>

      <HoneypotField id="website" registration={register('website')} />

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          variant="cta"
          size="lg"
          isLoading={isSubmitting || submit.isPending}
          loadingText="Sending…"
        >
          <Send />
          Send inquiry
        </Button>

        <p className="flex items-start gap-1.5 text-2xs text-muted-foreground">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          We use your number to answer this inquiry. No marketing, no list.
        </p>
      </div>
    </form>
  );
}
