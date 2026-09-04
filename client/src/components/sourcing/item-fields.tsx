'use client';

import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BRANDS } from '@/lib/constants';
import type { SourcingRequestFormValues } from '@/lib/forms';

/**
 * What the customer is trying to find.
 *
 * `itemDescription` is the only required field here and it is deliberately a
 * textarea rather than a set of dropdowns. Somebody standing in front of a
 * failed breaker has a photo of a nameplate and a rating, not a taxonomy —
 * making them classify the part before they can ask is how you lose the
 * request to a phone call at a competitor.
 */

const URGENCY = [
  ['standard', 'Standard'],
  ['urgent', 'Urgent — line is down'],
] as const;

const UNITS = ['piece', 'meter', 'roll', 'box', 'set'] as const;

interface Props {
  register: UseFormRegister<SourcingRequestFormValues>;
  errors: FieldErrors<SourcingRequestFormValues>;
  setValue: UseFormSetValue<SourcingRequestFormValues>;
  brand: string | undefined;
  unit: string | undefined;
  urgency: SourcingRequestFormValues['sourcingDetails']['urgency'];
  isRepeat: boolean;
}

export function ItemFields({
  register,
  errors,
  setValue,
  brand,
  unit,
  urgency,
  isRepeat,
}: Props): JSX.Element {
  const details = errors.sourcingDetails;

  return (
    <fieldset className="space-y-4 rounded-lg border border-border bg-white p-5">
      <legend className="px-1 font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
        What are you looking for?
      </legend>

      <Field
        label="Describe the item"
        htmlFor="s-desc"
        required
        hint="A nameplate reading, a rating, or just what it has to do — whatever you have."
        error={details?.itemDescription?.message}
      >
        <Textarea
          id="s-desc"
          rows={4}
          placeholder="Terasaki AR208S 800A draw-out ACB, 3-pole, with a motorised operating mechanism. Replacing a failed unit in an incomer panel."
          {...register('sourcingDetails.itemDescription')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Preferred brand"
          htmlFor="s-brand"
          hint="No preference is a real answer — we will suggest what suits."
        >
          <Select
            value={brand ?? ''}
            onValueChange={(value) => setValue('sourcingDetails.preferredBrand', value)}
          >
            <SelectTrigger id="s-brand">
              <SelectValue placeholder="No preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="No preference">No preference</SelectItem>
              {BRANDS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
              <SelectItem value="Other">Other — I will describe it</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Part number"
          htmlFor="s-part"
          hint="If you have it off the old unit."
          error={details?.partNumber?.message}
        >
          <Input id="s-part" placeholder="AR208S-800" {...register('sourcingDetails.partNumber')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quantity" htmlFor="s-qty" error={details?.quantity?.message}>
          <Input
            id="s-qty"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="1"
            {...register('sourcingDetails.quantity')}
          />
        </Field>

        <Field label="Unit" htmlFor="s-unit">
          <Select
            value={unit ?? ''}
            onValueChange={(value) =>
              setValue(
                'sourcingDetails.unit',
                value as SourcingRequestFormValues['sourcingDetails']['unit'],
              )
            }
          >
            <SelectTrigger id="s-unit">
              <SelectValue placeholder="piece" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="How soon?" htmlFor="s-urgency">
          <Select
            value={urgency}
            onValueChange={(value) =>
              setValue(
                'sourcingDetails.urgency',
                value as SourcingRequestFormValues['sourcingDetails']['urgency'],
              )
            }
          >
            <SelectTrigger id="s-urgency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URGENCY.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Needed by"
          htmlFor="s-required-by"
          hint="Roughly is fine — it tells us whether air freight is worth quoting."
          error={details?.requiredBy?.message}
        >
          <Input
            id="s-required-by"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            {...register('sourcingDetails.requiredBy')}
          />
        </Field>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2.5 text-sm">
            <Checkbox
              id="s-repeat"
              checked={isRepeat}
              onCheckedChange={(checked) =>
                setValue('sourcingDetails.isRepeatRequirement', checked === true)
              }
            />
            We need this regularly
          </label>
        </div>
      </div>

      <Field
        label="Specifications"
        htmlFor="s-specs"
        hint="Voltage, poles, breaking capacity, IP rating — anything that has to match."
        error={details?.specifications?.message}
      >
        <Textarea
          id="s-specs"
          rows={3}
          placeholder="415 V, 3P, 65 kA Icu, draw-out, with earth fault protection"
          {...register('sourcingDetails.specifications')}
        />
      </Field>

      <Field
        label="What is it for?"
        htmlFor="s-application"
        hint="The application often tells us a cheaper part would do the same job."
        error={details?.application?.message}
      >
        <Input
          id="s-application"
          placeholder="Incomer panel, textile mill"
          {...register('sourcingDetails.application')}
        />
      </Field>
    </fieldset>
  );
}
