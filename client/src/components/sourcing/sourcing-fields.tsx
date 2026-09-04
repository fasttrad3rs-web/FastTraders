'use client';

import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Checkbox, RadioGroup, RadioGroupItem } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAKISTANI_CITIES } from '@/lib/constants';
import type { SourcingRequestFormValues } from '@/lib/forms';

/**
 * The contact half of the sourcing form.
 *
 * Split out purely for length. Phone is the only required channel — the same
 * rule as the inquiry form, for the same reason: a trade buyer who does not
 * check email is still a customer, and demanding an address loses the lead.
 */

interface Props {
  register: UseFormRegister<SourcingRequestFormValues>;
  errors: FieldErrors<SourcingRequestFormValues>;
  setValue: UseFormSetValue<SourcingRequestFormValues>;
  city: string | undefined;
  sameWhatsApp: boolean;
  onSameWhatsAppChange: (next: boolean) => void;
  preferred: SourcingRequestFormValues['preferredContactMethod'];
}

export function ContactFields({
  register,
  errors,
  setValue,
  city,
  sameWhatsApp,
  onSameWhatsAppChange,
  preferred,
}: Props): JSX.Element {
  return (
    <fieldset className="space-y-4 rounded-lg border border-border bg-white p-5">
      <legend className="px-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        How do we reach you?
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="s-name" required error={errors.customer?.name?.message}>
          <Input id="s-name" autoComplete="name" placeholder="Imran Sheikh" {...register('customer.name')} />
        </Field>

        <Field
          label="Mobile number"
          htmlFor="s-phone"
          required
          hint="We will call you on this."
          error={errors.customer?.phone?.message}
        >
          <Input
            id="s-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0300 1234567"
            {...register('customer.phone')}
          />
        </Field>
      </div>

      {/* Most people use one number for both, so default to that and let the
          minority who don't open the field. */}
      <label className="flex items-center gap-2.5 text-sm">
        <Checkbox
          id="s-same-whatsapp"
          checked={sameWhatsApp}
          onCheckedChange={(checked) => onSameWhatsAppChange(checked === true)}
        />
        WhatsApp is the same as my mobile number
      </label>

      {!sameWhatsApp ? (
        <Field
          label="WhatsApp number"
          htmlFor="s-whatsapp"
          error={errors.customer?.whatsapp?.message}
        >
          <Input
            id="s-whatsapp"
            type="tel"
            inputMode="tel"
            placeholder="0300 1234567"
            {...register('customer.whatsapp')}
          />
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Company" htmlFor="s-company" error={errors.customer?.company?.message}>
          <Input
            id="s-company"
            autoComplete="organization"
            placeholder="Kohinoor Textile Mills"
            {...register('customer.company')}
          />
        </Field>

        <Field label="City" htmlFor="s-city" error={errors.customer?.city?.message}>
          <Select value={city ?? ''} onValueChange={(value) => setValue('customer.city', value)}>
            <SelectTrigger id="s-city">
              <SelectValue placeholder="Select a city" />
            </SelectTrigger>
            <SelectContent>
              {PAKISTANI_CITIES.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Email"
          htmlFor="s-email"
          hint="Optional."
          error={errors.customer?.email?.message}
        >
          <Input
            id="s-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register('customer.email')}
          />
        </Field>
      </div>

      <Field label="Preferred way to reach you" htmlFor="s-method">
        <RadioGroup
          id="s-method"
          value={preferred}
          onValueChange={(value) =>
            setValue(
              'preferredContactMethod',
              value as SourcingRequestFormValues['preferredContactMethod'],
            )
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
              <RadioGroupItem value={value} id={`s-method-${value}`} />
              {label}
            </label>
          ))}
        </RadioGroup>
      </Field>

      <Field
        label="Best time to call"
        htmlFor="s-time"
        hint="Free text — “after 5pm”, “not during Jummah”, whatever suits."
        error={errors.preferredContactTime?.message}
      >
        <Input id="s-time" placeholder="After 4pm" {...register('preferredContactTime')} />
      </Field>

      <Field label="Anything else?" htmlFor="s-message" error={errors.message?.message}>
        <Textarea
          id="s-message"
          rows={3}
          placeholder="Site work starts on the 20th, so I need lead times before I commit."
          {...register('message')}
        />
      </Field>
    </fieldset>
  );
}
