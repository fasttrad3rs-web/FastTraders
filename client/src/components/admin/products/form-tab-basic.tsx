'use client';

import { Field } from '@/components/ui/label';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Form, Taxonomy } from './form-types';

/** The product form's "Basic info" panel. */
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
          <Select
            value={watch('category')}
            onValueChange={(value) => {
              setValue('category', value, { shouldDirty: true });
              // The old sub-category almost certainly belongs to a different
              // parent now, and the server rejects a mismatched pair.
              setValue('subCategory', '', { shouldDirty: true });
            }}
          >
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
        {/*
          Sub-category had a schema field and a default value but no control,
          so it could never be set from the admin. The catalogue filters on it
          and the category tree uses it for grouping, so a product created here
          was invisible to both.
        */}
        <Field
          label="Sub-category"
          htmlFor="pf-subcategory"
          hint={
            watch('category')
              ? 'Optional. Only sub-categories of the chosen category are listed.'
              : 'Choose a category first.'
          }
        >
          <Select
            value={watch('subCategory') || 'none'}
            onValueChange={(value) =>
              setValue('subCategory', value === 'none' ? '' : value, { shouldDirty: true })
            }
          >
            <SelectTrigger id="pf-subcategory"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {categories
                /*
                 * Children of the SELECTED category only.
                 *
                 * This used to offer every nested category, so "Control
                 * Components" could be paired with "Sensors" — which lives
                 * under Automation. The product saved happily and then showed
                 * up under neither: no chip on the category page, and the
                 * sub-category filter matched nothing.
                 */
                .filter((item) => item.parent && item.parent === watch('category'))
                .map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
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

/**
 * Internal pricing and stock.
 *
 * Nothing on this tab is ever published — Fast Traders shows no prices. These
 * figures exist so staff can build a quotation and value the shelf.
 */
