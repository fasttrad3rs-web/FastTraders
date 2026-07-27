'use client';

import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Label } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import type { ProductFormValues } from './form-schema';

/** Panels for the product form's seven tabs. */

type Form = UseFormReturn<ProductFormValues>;
type Taxonomy = { id: string; name: string; level?: number }[];

export function BasicTab({ form, categories, brands }: { form: Form; categories: Taxonomy; brands: Taxonomy }): JSX.Element {
  const { register, watch, setValue, formState } = form;
  const { errors } = formState;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" htmlFor="pf-name" required error={errors.name?.message}>
          <Input id="pf-name" {...register('name')} hasError={Boolean(errors.name)} />
        </Field>
        <Field label="URL slug" htmlFor="pf-slug" hint="Generated from the name; edit only if you must." error={errors.slug?.message}>
          <Input id="pf-slug" className="font-mono text-xs" {...register('slug')} hasError={Boolean(errors.slug)} />
        </Field>
        <Field label="SKU" htmlFor="pf-sku" required error={errors.sku?.message}>
          <Input id="pf-sku" className="font-mono" {...register('sku')} hasError={Boolean(errors.sku)} />
        </Field>
        <Field label="Manufacturer part number" htmlFor="pf-mpn" hint="What trade buyers search by.">
          <Input id="pf-mpn" className="font-mono" {...register('partNumber')} />
        </Field>
        <Field label="Category" htmlFor="pf-category" required error={errors.category?.message}>
          <Select value={watch('category')} onValueChange={(value) => setValue('category', value, { shouldDirty: true })}>
            <SelectTrigger id="pf-category"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {'— '.repeat(item.level ?? 0)}{item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Brand" htmlFor="pf-brand" required error={errors.brand?.message}>
          <Select value={watch('brand')} onValueChange={(value) => setValue('brand', value, { shouldDirty: true })}>
            <SelectTrigger id="pf-brand"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {brands.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Short description" htmlFor="pf-short" hint="One line, shown on cards and in search results.">
        <Textarea id="pf-short" rows={2} {...register('shortDescription')} />
      </Field>

      <Field
        label="Full description"
        htmlFor="pf-desc"
        required
        hint="Basic HTML is supported: <p>, <strong>, <ul>, <li>."
        error={errors.description?.message}
      >
        <Textarea id="pf-desc" rows={8} className="font-mono text-xs" {...register('description')} hasError={Boolean(errors.description)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tags" htmlFor="pf-tags" hint="Comma separated — these feed search and filters.">
          <Input id="pf-tags" placeholder="mccb, 250a, schneider" {...register('tags')} />
        </Field>
        <Field label="Warranty" htmlFor="pf-warranty">
          <Input id="pf-warranty" placeholder="12 months manufacturer warranty" {...register('warranty')} />
        </Field>
      </div>

      <fieldset className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flags</legend>
        {([
          ['isActive', 'Active — visible on the storefront'],
          ['isFeatured', 'Featured on the homepage'],
          ['isNewArrival', 'New arrival'],
          ['isBestSeller', 'Best seller'],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2.5">
            <Checkbox
              id={`pf-${key}`}
              checked={watch(key)}
              onCheckedChange={(checked) => setValue(key, checked === true, { shouldDirty: true })}
            />
            <Label htmlFor={`pf-${key}`} className="font-normal">{label}</Label>
          </div>
        ))}
      </fieldset>
    </div>
  );
}

export function PricingTab({ form }: { form: Form }): JSX.Element {
  const { register, watch, setValue, formState } = form;
  const { errors } = formState;
  const mode = watch('pricingMode');

  return (
    <div className="space-y-4">
      <Field label="Pricing mode" htmlFor="pf-mode" required>
        <Select value={mode} onValueChange={(value) => setValue('pricingMode', value as ProductFormValues['pricingMode'], { shouldDirty: true })}>
          <SelectTrigger id="pf-mode"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="retail">Retail — priced and buyable online</SelectItem>
            <SelectItem value="quote">Quote only — price hidden, RFQ</SelectItem>
            <SelectItem value="both">Both — priced, with a bulk-quote option</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {mode === 'quote' ? (
        <Alert variant="info" className="text-xs">
          Quote-only products show &ldquo;Price on request&rdquo; and go to the inquiry cart. No price
          is published, and none is written into the product schema for Google.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Selling price (Rs.)" htmlFor="pf-price" required={mode !== 'quote'} error={errors.price?.message}>
          <Input id="pf-price" type="number" min={0} step="0.01" disabled={mode === 'quote'} {...register('price')} hasError={Boolean(errors.price)} />
        </Field>
        <Field label="Compare-at price (Rs.)" htmlFor="pf-compare" hint="Shown struck through." error={errors.comparePrice?.message}>
          <Input id="pf-compare" type="number" min={0} step="0.01" disabled={mode === 'quote'} {...register('comparePrice')} hasError={Boolean(errors.comparePrice)} />
        </Field>
        <Field label="Cost price (Rs.)" htmlFor="pf-cost" hint="Internal only. Never exposed publicly.">
          <Input id="pf-cost" type="number" min={0} step="0.01" {...register('costPrice')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tax rate (%)" htmlFor="pf-tax">
          <Input id="pf-tax" type="number" min={0} max={100} {...register('taxRate')} />
        </Field>
        <Field label="Stock on hand" htmlFor="pf-stock" hint="Use the stock adjustment action for audited changes.">
          <Input id="pf-stock" type="number" min={0} {...register('stock')} />
        </Field>
        <Field label="Low-stock threshold" htmlFor="pf-threshold">
          <Input id="pf-threshold" type="number" min={0} {...register('lowStockThreshold')} />
        </Field>
        <Field label="Minimum order qty" htmlFor="pf-moq">
          <Input id="pf-moq" type="number" min={1} {...register('minOrderQty')} />
        </Field>
      </div>

      <Field label="Unit" htmlFor="pf-unit">
        <Select value={watch('unit')} onValueChange={(value) => setValue('unit', value as ProductFormValues['unit'], { shouldDirty: true })}>
          <SelectTrigger id="pf-unit" className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['piece', 'meter', 'roll', 'box', 'set'] as const).map((unit) => (
              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
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
