'use client';

import { useFieldArray } from 'react-hook-form';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { AVAILABILITY, AVAILABILITY_LABELS } from '@/lib/availability';
import type { ProductFormValues } from './form-schema';
import type { Form } from './form-types';

/** Panels for the product form's seven tabs. */

/**
 * The form handle, loosened at the third generic.
 *
 * zod `.default()` makes a field optional going in and required coming out,
 * so RHF's transformed-values generic does not line up with a plain
 * `UseFormReturn<Values>`. Widening it here is contained to one alias; the
 * alternative is a cast at every one of the seven tab call sites.
 */

export function PricingTab({ form }: { form: Form }): JSX.Element {
  const { register, watch, setValue, formState } = form;
  const { errors } = formState;

  return (
    <div className="space-y-4">
      <Alert variant="info" className="text-xs">
        These prices are <strong>internal only</strong>. The storefront shows
        &ldquo;Price on request&rdquo; on every product and routes the customer to a phone call,
        WhatsApp, or an enquiry.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Last quoted price (Rs.)" htmlFor="pf-last-quoted" hint="Internal reference. Never published." error={errors.lastQuotedPrice?.message}>
          <Input id="pf-last-quoted" type="number" min={0} step="0.01" {...register('lastQuotedPrice')} hasError={Boolean(errors.lastQuotedPrice)} />
        </Field>
        <Field label="Internal cost (Rs.)" htmlFor="pf-cost" hint="Drives stock valuation in reports. Never published.">
          <Input id="pf-cost" type="number" min={0} step="0.01" {...register('internalCost')} />
        </Field>
      </div>

      {/*
        Availability is the ONLY stock signal a buyer ever sees, and until now
        the form had no input for it — every product created here kept the
        `available_on_order` default forever. Setting "Stock on hand" to 10 did
        nothing to the storefront, because that is a separate internal count.
        It leads this tab for that reason.
      */}
      <div className="grid gap-4 rounded-lg border border-brand-cyan/40 bg-brand-cyan/5 p-4 sm:grid-cols-2">
        <Field
          label="Availability — what the customer sees"
          htmlFor="pf-availability"
          hint="Shown on the card and the product page."
          error={errors.availability?.message}
        >
          <Select
            value={watch('availability')}
            onValueChange={(value) =>
              setValue('availability', value as ProductFormValues['availability'], {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger id="pf-availability"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AVAILABILITY.map((value) => (
                <SelectItem key={value} value={value}>
                  {AVAILABILITY_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Lead time"
          htmlFor="pf-lead"
          hint='Optional, e.g. "2-3 days" or "3-4 weeks (imported)".'
        >
          <Input id="pf-lead" placeholder="2-3 days" {...register('leadTime')} />
        </Field>
      </div>

      <div className="flex items-center gap-2.5 rounded-lg border border-border p-4">
        <Checkbox
          id="pf-mto"
          checked={watch('isImportItem')}
          onCheckedChange={(checked) => setValue('isImportItem', checked === true, { shouldDirty: true })}
        />
        <Label htmlFor="pf-mto" className="font-normal">
          Sourced or imported to order — not held in stock
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Stock on hand"
          htmlFor="pf-stock"
          hint="Internal count for reports. Buyers see Availability, not this."
        >
          <Input id="pf-stock" type="number" min={0} {...register('stock')} />
        </Field>
        <Field label="Low-stock threshold" htmlFor="pf-threshold">
          <Input id="pf-threshold" type="number" min={0} {...register('lowStockThreshold')} />
        </Field>
        <Field label="Typical minimum qty" htmlFor="pf-moq">
          <Input id="pf-moq" type="number" min={1} {...register('minOrderQty')} />
        </Field>
        <Field label="Unit" htmlFor="pf-unit">
          <Select value={watch('unit')} onValueChange={(value) => setValue('unit', value as ProductFormValues['unit'], { shouldDirty: true })}>
            <SelectTrigger id="pf-unit"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['piece', 'meter', 'roll', 'box', 'set'] as const).map((unit) => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

/** Generic repeater used by specifications, variants and datasheets. */
export function RepeaterTab({
  form,
  name,
  columns,
  addLabel,
  emptyHint,
}: {
  form: Form;
  name: 'specifications' | 'variants' | 'datasheets';
  columns: { key: string; label: string; placeholder?: string; type?: string; width?: string }[];
  addLabel: string;
  emptyHint: string;
}): JSX.Element {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name });

  const blank = Object.fromEntries(columns.map((column) => [column.key, ''])) as never;

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <li key={field.id} className="flex items-start gap-2 rounded-lg border border-border bg-white p-2">
              <GripVertical className="mt-2.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                {columns.map((column) => (
                  <Input
                    key={column.key}
                    type={column.type ?? 'text'}
                    placeholder={column.placeholder ?? column.label}
                    aria-label={`${column.label} for row ${index + 1}`}
                    className={column.width}
                    {...register(`${name}.${index}.${column.key}` as never)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove row ${index + 1}`}
                className="mt-1 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => append(blank)}>
        <Plus />
        {addLabel}
      </Button>
    </div>
  );
}

export function SeoTab({ form }: { form: Form }): JSX.Element {
  const { register, watch } = form;
  const title = watch('seoTitle') || `${watch('name')} | Fast Traders`;
  const description = watch('seoDescription') || watch('shortDescription') || '';

  return (
    <div className="space-y-4">
      <Field label="SEO title" htmlFor="pf-seo-title" hint="Max 70 characters. Falls back to the product name.">
        <Input id="pf-seo-title" maxLength={70} {...register('seoTitle')} />
      </Field>
      <Field label="Meta description" htmlFor="pf-seo-desc" hint="Max 180 characters.">
        <Textarea id="pf-seo-desc" rows={3} maxLength={180} {...register('seoDescription')} />
      </Field>
      <Field label="Keywords" htmlFor="pf-seo-kw" hint="Comma separated.">
        <Input id="pf-seo-kw" placeholder="mccb lahore, 250a breaker price" {...register('seoKeywords')} />
      </Field>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
          Google preview
        </p>
        <p className="text-sm text-[#1a0dab]">{title.slice(0, 70)}</p>
        <p className="text-xs text-[#006621]">www.fasttraders.co › products › {watch('slug') || '…'}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description.slice(0, 180)}</p>
      </div>
    </div>
  );
}

