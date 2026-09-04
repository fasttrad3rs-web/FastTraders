import { z } from 'zod';

/** Admin product form schema — mirrors the Phase 4 server validator. */

export const specRow = z.object({
  key: z.string().trim().min(1, 'Required').max(80),
  value: z.string().trim().min(1, 'Required').max(200),
  group: z.string().trim().max(60).optional(),
});

export const variantRow = z.object({
  name: z.string().trim().min(1, 'Required').max(120),
  sku: z.string().trim().min(1, 'Required').max(60),
  price: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
});

export const datasheetRow = z.object({
  title: z.string().trim().min(1, 'Required').max(160),
  url: z.string().url('Must be a URL'),
  publicId: z.string().trim().min(1).default('manual'),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(3, 'At least 3 characters').max(200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase, hyphen-separated')
      .optional()
      .or(z.literal('')),
    sku: z.string().trim().min(1, 'SKU is required').max(60),
    partNumber: z.string().trim().max(80).optional().or(z.literal('')),
    description: z.string().trim().min(10, 'Add a description').max(20000),
    shortDescription: z.string().trim().max(400).optional().or(z.literal('')),

    category: z.string().min(1, 'Choose a category'),
    subCategory: z.string().optional().or(z.literal('')),
    brand: z.string().min(1, 'Choose a brand'),

    /* What a buyer is told, instead of a stock count. */
    availability: z.enum([
      'ready_stock',
      'available_on_order',
      'import_on_request',
      'discontinued',
    ]),
    leadTime: z.string().trim().max(80).optional().or(z.literal('')),
    isImportItem: z.boolean().default(false),
    lastQuotedPrice: z.coerce.number().nonnegative().optional(),
    internalCost: z.coerce.number().nonnegative().optional(),

    stock: z.coerce.number().int().nonnegative().default(0),
    lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).default('piece'),
    minOrderQty: z.coerce.number().int().positive().default(1),

    specifications: z.array(specRow).max(60).default([]),
    variants: z.array(variantRow).max(40).default([]),
    datasheets: z.array(datasheetRow).max(10).default([]),
    tags: z.string().trim().max(400).optional().or(z.literal('')),
    warranty: z.string().trim().max(120).optional().or(z.literal('')),

    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isActive: z.boolean().default(true),

    seoTitle: z.string().trim().max(70).optional().or(z.literal('')),
    seoDescription: z.string().trim().max(180).optional().or(z.literal('')),
    seoKeywords: z.string().trim().max(400).optional().or(z.literal('')),
  })
  .refine(
    (data) => data.internalCost === undefined || data.lastQuotedPrice === undefined || data.lastQuotedPrice >= data.internalCost,
    { message: 'A quoted price below cost is almost always a typo', path: ['lastQuotedPrice'] },
  )
  /*
   * The next two mirror `createProductSchema` on the server. They are not
   * belt-and-braces: without them the server rejects the save with a 422 that
   * the form renders as a generic "Could not save" toast, giving the operator
   * no idea which field is wrong. Duplicated deliberately so the error lands
   * on the offending input.
   */
  .refine((data) => data.availability !== 'ready_stock' || data.stock > 0, {
    message: 'Ready stock needs a stock figure above zero — set Stock on hand, or choose another availability',
    path: ['availability'],
  })
  .refine((data) => !data.isImportItem || Boolean(data.leadTime), {
    message: 'An imported item needs a lead time — it is the first thing a buyer asks',
    path: ['leadTime'],
  });

/**
 * Two types, because zod `.default()` makes a field optional on the way in
 * and required on the way out. React Hook Form needs the input shape for
 * `defaultValues` and the output shape for the submit handler; conflating
 * them is what makes the resolver generics fight.
 */
export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormValues = z.output<typeof productFormSchema>;

/** Turn a product name into a URL slug. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Map form values onto the admin API payload.
 *
 * **Every field in `productFormSchema` must appear here.** Three did not —
 * `availability`, `leadTime` and `datasheets` — so the operator picked "Ready
 * Stock", saved, and the product came back "Available on Order": the field was
 * never in the request at all, and Mongoose applied its default. Nothing
 * failed, nothing warned, and the live preview kept showing the chosen value
 * because it reads the form rather than the response.
 *
 * A silent drop is the worst failure mode an admin form has — the operator has
 * no reason to doubt what they just did. `scripts/verify/catalog-pivot.cjs`
 * now diffs the schema keys against this function and fails the build if they
 * ever diverge again.
 */
export function toApiPayload(values: ProductFormValues): Record<string, unknown> {
  const csv = (value?: string): string[] =>
    value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];

  return {
    name: values.name,
    ...(values.slug ? { slug: values.slug } : {}),
    sku: values.sku,
    ...(values.partNumber ? { partNumber: values.partNumber } : {}),
    description: values.description,
    ...(values.shortDescription ? { shortDescription: values.shortDescription } : {}),
    category: values.category,
    subCategory: values.subCategory || null,
    brand: values.brand,
    availability: values.availability,
    /* Null, not omitted — an omitted key leaves the old lead time in place,
       so an operator clearing the box would see it come straight back. */
    leadTime: values.leadTime || null,
    isImportItem: values.isImportItem,
    ...(typeof values.lastQuotedPrice === 'number' ? { lastQuotedPrice: values.lastQuotedPrice } : {}),
    ...(typeof values.internalCost === 'number' ? { internalCost: values.internalCost } : {}),
    stock: values.stock,
    lowStockThreshold: values.lowStockThreshold,
    unit: values.unit,
    minOrderQty: values.minOrderQty,
    specifications: values.specifications,
    variants: values.variants.map((variant) => ({ ...variant, attributes: {} })),
    datasheets: values.datasheets,
    tags: csv(values.tags),
    ...(values.warranty ? { warranty: values.warranty } : {}),
    isFeatured: values.isFeatured,
    isNewArrival: values.isNewArrival,
    isBestSeller: values.isBestSeller,
    isActive: values.isActive,
    seo: {
      ...(values.seoTitle ? { title: values.seoTitle } : {}),
      ...(values.seoDescription ? { description: values.seoDescription } : {}),
      keywords: csv(values.seoKeywords),
    },
  };
}
