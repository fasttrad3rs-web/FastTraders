'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import { contactSchema } from '@/lib/forms';

type ContactInput = z.infer<typeof contactSchema>;

/** Contact form with a hidden honeypot field the API also checks. */
export function ContactForm(): JSX.Element {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await apiClient.post('/contact', { ...values, source: 'contact_form' });
      reset();
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send your message.');
    }
  });

  if (sent) {
    return (
      <Alert variant="success" title="Message sent">
        Thank you — we will be in touch shortly. For anything urgent, WhatsApp +92 324 4234990.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ct-name" required error={errors.name?.message}>
          <Input id="ct-name" {...register('name')} hasError={Boolean(errors.name)} />
        </Field>
        <Field label="Phone" htmlFor="ct-phone" error={errors.phone?.message}>
          <Input id="ct-phone" type="tel" {...register('phone')} hasError={Boolean(errors.phone)} />
        </Field>
      </div>

      <Field label="Email" htmlFor="ct-email" required error={errors.email?.message}>
        <Input id="ct-email" type="email" {...register('email')} hasError={Boolean(errors.email)} />
      </Field>

      <Field label="Subject" htmlFor="ct-subject" required error={errors.subject?.message}>
        <Input id="ct-subject" placeholder="Stock enquiry — MCCB 250A" {...register('subject')} hasError={Boolean(errors.subject)} />
      </Field>

      <Field label="Message" htmlFor="ct-message" required error={errors.message?.message}>
        <Textarea id="ct-message" rows={5} {...register('message')} hasError={Boolean(errors.message)} />
      </Field>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label htmlFor="ct-website">Leave this empty</label>
        <input id="ct-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <Button type="submit" variant="cta" size="lg" isLoading={isSubmitting} loadingText="Sending…">
        <Send />
        Send message
      </Button>
    </form>
  );
}
