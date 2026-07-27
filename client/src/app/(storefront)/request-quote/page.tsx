'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Paperclip, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Breadcrumb } from '@/components/ui/pagination';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/components/ui/toast';
import { useCart, useCreateQuotation } from '@/lib/api/mutations';
import { rfqSchema, type RfqInput } from '@/lib/forms';
import { useAuth } from '@/lib/auth-context';

/**
 * RFQ submission.
 *
 * The item list comes from the server-side inquiry cart, so the buyer cannot
 * tamper with it and it survives a page reload mid-form.
 */
export default function RequestQuotePage(): JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cart, isPending } = useCart('inquiry');
  const createQuotation = useCreateQuotation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RfqInput>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      customer: {
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        companyName: user?.companyName ?? '',
        city: '',
      },
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const quotation = await createQuotation.mutateAsync({
        customer: values.customer,
        ...(values.message ? { message: values.message } : {}),
        ...(values.requiredBy ? { requiredBy: values.requiredBy } : {}),
      });

      toast.success(`Request ${quotation.quoteNumber} sent`, {
        description: 'We will respond within one working day.',
      });
      router.push(`/account/quotations/${quotation.quoteNumber}`);
    } catch (error) {
      toast.error('Could not send your request', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  });

  return (
    <div className="container py-8">
      <Breadcrumb items={[{ label: 'Request a quote' }]} className="mb-4" />

      <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
        Request a Quotation
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Tell us who you are and what you need. We serve contractors, panel builders and factories,
        and quote against your bill of materials.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-lg border border-border bg-white p-6">
          <fieldset className="space-y-4">
            <legend className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
              Your details
            </legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="rfq-name" required error={errors.customer?.name?.message}>
                <Input id="rfq-name" {...register('customer.name')} hasError={Boolean(errors.customer?.name)} />
              </Field>
              <Field label="Company" htmlFor="rfq-company" hint="Optional, but helps us price correctly.">
                <Input id="rfq-company" {...register('customer.companyName')} />
              </Field>
              <Field label="Email" htmlFor="rfq-email" required error={errors.customer?.email?.message}>
                <Input id="rfq-email" type="email" {...register('customer.email')} hasError={Boolean(errors.customer?.email)} />
              </Field>
              <Field label="Phone / WhatsApp" htmlFor="rfq-phone" required error={errors.customer?.phone?.message}>
                <Input id="rfq-phone" type="tel" placeholder="0300 1234567" {...register('customer.phone')} hasError={Boolean(errors.customer?.phone)} />
              </Field>
              <Field label="City" htmlFor="rfq-city" hint="Where the goods are going.">
                <Input id="rfq-city" placeholder="Lahore" {...register('customer.city')} />
              </Field>
              <Field label="Required by" htmlFor="rfq-date" error={errors.requiredBy?.message}>
                <Input id="rfq-date" type="date" {...register('requiredBy')} hasError={Boolean(errors.requiredBy)} />
              </Field>
            </div>
          </fieldset>

          <Field
            label="Message"
            htmlFor="rfq-message"
            hint="Ratings, quantities, site conditions, or paste your bill of materials."
            error={errors.message?.message}
          >
            <Textarea id="rfq-message" rows={5} {...register('message')} />
          </Field>

          <Alert variant="info" title="Attachments">
            <span className="flex items-start gap-2 text-xs">
              <Paperclip className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              To attach a drawing or BOM spreadsheet, email it to{' '}
              <a href="mailto:fasttrad3rs@gmail.com" className="font-medium">
                fasttrad3rs@gmail.com
              </a>{' '}
              quoting the reference we send you, or WhatsApp it to +92 324 4234990.
            </span>
          </Alert>

          <Button
            type="submit"
            variant="cta"
            size="lg"
            block
            isLoading={isSubmitting || createQuotation.isPending}
            loadingText="Sending…"
            disabled={!cart || cart.items.length === 0}
          >
            <Send />
            Send request
          </Button>
        </form>

        <aside className="sticky top-24 rounded-lg border border-border bg-white p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            Items on this request
          </h2>

          {isPending ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : !cart || cart.items.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 px-0 py-6"
              title="Nothing on the list"
              description="Add products to your inquiry list first."
              icon={<FileText />}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/products">Browse products</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ul className="mt-4 divide-y divide-border text-sm">
                {cart.items.map((line) => (
                  <li key={line.product} className="py-2.5">
                    <p className="line-clamp-2 font-medium text-foreground">{line.name}</p>
                    <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
                      {line.sku} · {line.qty} {line.unit}
                    </p>
                    {line.note ? (
                      <p className="mt-1 text-2xs italic text-muted-foreground">“{line.note}”</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <Button asChild variant="ghost" size="sm" block className="mt-3">
                <Link href="/inquiry">Edit the list</Link>
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
