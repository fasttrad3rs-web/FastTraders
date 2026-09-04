'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MessageCircle, Send } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSubmitSourcingInquiry, type SourcingReceipt } from '@/lib/api/mutations';
import { sourcingRequestSchema, type SourcingRequestFormValues } from '@/lib/forms';
import { trackInquirySubmitted, trackWhatsApp } from '@/lib/analytics';
import { AttachmentPicker, type PickedFile } from './attachment-picker';
import { ContactFields } from './sourcing-fields';
import { ItemFields } from './item-fields';
import { buildSourcingWhatsAppUrl } from './whatsapp-fallback';
import { SourcingReceiptCard } from './sourcing-receipt';
import { useFormToken } from '@/hooks/use-form-token';
import { HoneypotField } from '@/components/shared/honeypot-field';

/**
 * "We can get it" — the form behind the sourcing promise.
 *
 * Fast Traders imports to order, so a part being absent from the catalogue is
 * a lead rather than a dead end. This is the only route on the site that
 * accepts a request for something we do not list.
 *
 * `productSlug` arrives from `/source-from-china?product=…` on a product page,
 * where the customer wants a different rating of something we *do* stock. It
 * is passed through in the message so staff can see what prompted the request.
 */
export function SourcingForm({
  productSlug,
  productName,
}: {
  productSlug?: string;
  productName?: string;
}): JSX.Element {
  const [receipt, setReceipt] = useState<SourcingReceipt | null>(null);
  const [sameWhatsApp, setSameWhatsApp] = useState(true);
  const [attachments, setAttachments] = useState<PickedFile[]>([]);
  const submit = useSubmitSourcingInquiry();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SourcingRequestFormValues>({
    resolver: zodResolver(sourcingRequestSchema),
    defaultValues: {
      preferredContactMethod: 'phone',
      website: '',
      sourcingDetails: {
        urgency: 'standard',
        // Pre-fill from the product they came off, so the box is not blank.
        itemDescription: productName ? `Similar to ${productName}, but ` : '',
      },
    },
  });

  const formToken = useFormToken();

  const onSubmit = handleSubmit((values) => {
    const { sourcingDetails } = values;
    const context = productSlug ? `Started from /products/${productSlug}.` : '';
    const message = [values.message, context].filter(Boolean).join(' ');

    submit.mutate(
      {
        ...(formToken() ? { formToken: formToken() } : {}),
        customer: {
          ...values.customer,
          // The checkbox is a UI convenience; the server stores one field.
          ...(sameWhatsApp ? { whatsapp: values.customer.phone } : {}),
        },
        ...(message ? { message } : {}),
        preferredContactMethod: values.preferredContactMethod,
        ...(values.preferredContactTime
          ? { preferredContactTime: values.preferredContactTime }
          : {}),
        sourcingDetails,
        website: values.website ?? '',
        attachments: attachments.map((item) => item.file),
      },
      {
        onSuccess: (data) => {
          trackInquirySubmitted({ type: 'sourcing_request', itemCount: 1 });
          setReceipt(data);
        },
        onError: (error) => setError('root', { message: error.message }),
      },
    );
  });

  if (receipt) {
    return (
      <SourcingReceiptCard
        inquiryNumber={receipt.inquiryNumber}
        attachmentsAccepted={receipt.attachmentsAccepted}
        attachmentsRejected={receipt.attachmentsRejected}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
      {errors.root ? (
        <Alert variant="danger" title="Could not send your request">
          {errors.root.message}
        </Alert>
      ) : null}

      <ItemFields
        register={register}
        errors={errors}
        setValue={setValue}
        brand={watch('sourcingDetails.preferredBrand')}
        unit={watch('sourcingDetails.unit')}
        urgency={watch('sourcingDetails.urgency')}
        isRepeat={watch('sourcingDetails.isRepeatRequirement') ?? false}
      />

      <fieldset className="space-y-3 rounded-lg border border-border bg-white p-5">
        <legend className="px-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Attachments
          <span className="ml-2 font-sans text-2xs font-normal normal-case text-muted-foreground">
            optional, but they save a phone call
          </span>
        </legend>
        <AttachmentPicker files={attachments} onChange={setAttachments} />
      </fieldset>

      <ContactFields
        register={register}
        errors={errors}
        setValue={setValue}
        city={watch('customer.city')}
        sameWhatsApp={sameWhatsApp}
        onSameWhatsAppChange={setSameWhatsApp}
        preferred={watch('preferredContactMethod')}
      />

      <HoneypotField id="s-website" registration={register('website')} />

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          variant="cta"
          size="lg"
          isLoading={isSubmitting || submit.isPending}
          loadingText="Sending…"
        >
          <Send />
          Send sourcing request
        </Button>

        {/*
          A peer of the submit button, not a consolation prize. Plenty of
          buyers here would rather send a message than fill four sections, and
          whatever they have typed goes with them.
        */}
        <Button asChild variant="outline" size="lg">
          <a
            href={buildSourcingWhatsAppUrl(watch(), attachments.length)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsApp({ context: 'generic' })}
          >
            <MessageCircle />
            Send on WhatsApp instead
          </a>
        </Button>

        <p className="flex w-full items-start gap-1.5 text-2xs text-muted-foreground">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          We use your number to answer this request. No marketing, no list.
        </p>
      </div>
    </form>
  );
}
