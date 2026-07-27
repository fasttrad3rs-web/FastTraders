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

    pricingMode: z.enum(['retail', 'quote', 'both']),
    price: z.coerce.number().nonnegative().optional(),
    comparePrice: z.coerce.number().nonnegative().optional(),
    costPrice: z.coerce.number().nonnegative().optional(),
    taxRate: z.coerce.number().min(0).max(100).default(18),

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
  .refine((data) => data.pricingMode === 'quote' || typeof data.price === 'number', {
    message: 'A price is required unless the product is quote-only',
    path: ['price'],
  })
  .refine(
    (data) =>
      data.comparePrice === undefined || data.price === undefined || data.comparePrice > data.price,
    { message: 'Compare price must be higher than the selling price', path: ['comparePrice'] },
  );

export type ProductFormValues = z.infer<typeof productFormSchema>;

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

/** Map form values onto the admin API payload. */
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
    pricingMode: values.pricingMode,
    ...(values.pricingMode !== 'quote' && typeof values.price === 'number' ? { price: values.price } : {}),
    ...(typeof values.comparePrice === 'number' ? { comparePrice: values.comparePrice } : {}),
    ...(typeof values.costPrice === 'number' ? { costPrice: values.costPrice } : {}),
    taxRate: values.taxRate,
    stock: values.stock,
    lowStockThreshold: values.lowStockThreshold,
    unit: values.unit,
    minOrderQty: values.minOrderQty,
    specifications: values.specifications,
    variants: values.variants.map((variant) => ({ ...variant, attributes: {} })),
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
