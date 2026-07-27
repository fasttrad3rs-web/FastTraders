import { z } from 'zod';
import {
  booleanQuerySchema,
  csvSchema,
  objectIdSchema,
  paginationSchema,
  slugSchema,
} from './common.validators';

/** Admin product, category, brand, banner and coupon payloads. */

const seoSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(180).optional(),
  keywords: z.array(z.string().trim().max(60)).max(20).default([]),
});

const specificationSchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(200),
  group: z.string().trim().max(60).optional(),
});

const variantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(60).toUpperCase(),
  attributes: z.record(z.string().max(120)).default({}),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  image: z.string().url().optional(),
});

/* -------------------------------- Products ------------------------------- */

export const createProductSchema = z
  .object({
    name: z.string().trim().min(3).max(200),
    /** Omit to auto-generate from the name with collision handling. */
    slug: slugSchema.optional(),
    sku: z.string().trim().min(1).max(60).toUpperCase(),
    partNumber: z.string().trim().max(80).toUpperCase().optional(),
    description: z.string().trim().min(10).max(20000),
    shortDescription: z.string().trim().max(400).optional(),
    category: objectIdSchema,
    subCategory: objectIdSchema.nullable().optional(),
    brand: objectIdSchema,
    pricingMode: z.enum(['retail', 'quote', 'both']),
    price: z.number().nonnegative().optional(),
    comparePrice: z.number().nonnegative().optional(),
    costPrice: z.number().nonnegative().optional(),
    taxRate: z.number().min(0).max(100).default(18),
    stock: z.number().int().nonnegative().default(0),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    /** Only honoured as `on_order`; otherwise derived from stock by the model. */
    stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'on_order']).optional(),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).default('piece'),
    minOrderQty: z.number().int().positive().default(1),
    specifications: z.array(specificationSchema).max(60).default([]),
    variants: z.array(variantSchema).max(40).default([]),
    tags: z.array(z.string().trim().max(40)).max(30).default([]),
    warranty: z.string().trim().max(120).optional(),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isActive: z.boolean().default(true),
    seo: seoSchema.optional(),
  })
  .refine((data) => data.pricingMode === 'quote' || typeof data.price === 'number', {
    message: 'A price is required unless the product is quote-only',
    path: ['price'],
  })
  .refine(
    (data) => data.comparePrice === undefined || data.price === undefined || data.comparePrice > data.price,
    { message: 'comparePrice must be higher than price', path: ['comparePrice'] },
  );
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Partial update; the price/pricingMode invariant is re-checked in the service. */
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(3).max(200).optional(),
    slug: slugSchema.optional(),
    sku: z.string().trim().min(1).max(60).toUpperCase().optional(),
    partNumber: z.string().trim().max(80).toUpperCase().nullable().optional(),
    description: z.string().trim().min(10).max(20000).optional(),
    shortDescription: z.string().trim().max(400).nullable().optional(),
    category: objectIdSchema.optional(),
    subCategory: objectIdSchema.nullable().optional(),
    brand: objectIdSchema.optional(),
    pricingMode: z.enum(['retail', 'quote', 'both']).optional(),
    price: z.number().nonnegative().nullable().optional(),
    comparePrice: z.number().nonnegative().nullable().optional(),
    costPrice: z.number().nonnegative().nullable().optional(),
    taxRate: z.number().min(0).max(100).optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'on_order']).optional(),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).optional(),
    minOrderQty: z.number().int().positive().optional(),
    specifications: z.array(specificationSchema).max(60).optional(),
    variants: z.array(variantSchema).max(40).optional(),
    tags: z.array(z.string().trim().max(40)).max(30).optional(),
    warranty: z.string().trim().max(120).nullable().optional(),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    isActive: z.boolean().optional(),
    seo: seoSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Stock is adjusted through its own audited endpoint, never a plain PATCH. */
export const stockAdjustmentSchema = z
  .object({
    mode: z.enum(['set', 'increment', 'decrement']),
    quantity: z.number().int().nonnegative(),
    reason: z.string().trim().min(3, 'A reason is required for the audit trail').max(200),
  })
  .refine((data) => data.mode === 'set' || data.quantity > 0, {
    message: 'Quantity must be greater than zero',
    path: ['quantity'],
  });
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const bulkProductSchema = z
  .object({
    ids: z.array(objectIdSchema).min(1, 'Select at least one product').max(500),
    action: z.enum(['activate', 'deactivate', 'delete', 'feature', 'unfeature', 'price_adjust']),
    /** Required for `price_adjust`. */
    adjust: z
      .object({
        type: z.enum(['percent', 'fixed']),
        /** Negative values reduce the price. */
        value: z.number(),
        field: z.enum(['price', 'comparePrice', 'costPrice']).default('price'),
        roundTo: z.number().int().nonnegative().default(0),
      })
      .optional(),
  })
  .refine((data) => data.action !== 'price_adjust' || data.adjust !== undefined, {
    message: 'A price adjustment needs an `adjust` block',
    path: ['adjust'],
  });
export type BulkProductInput = z.infer<typeof bulkProductSchema>;

export const adminProductQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  category: objectIdSchema.optional(),
  brand: objectIdSchema.optional(),
  pricingMode: z.enum(['retail', 'quote', 'both']).optional(),
  isActive: booleanQuerySchema.optional(),
  lowStock: booleanQuerySchema.optional(),
  outOfStock: booleanQuerySchema.optional(),
  tags: csvSchema.optional(),
  sort: z
    .enum(['newest', 'oldest', 'name', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc', 'sales'])
    .default('newest'),
});
export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('xlsx'),
  isActive: booleanQuerySchema.optional(),
  category: objectIdSchema.optional(),
  brand: objectIdSchema.optional(),
});

export const imageParamSchema = z.object({
  id: objectIdSchema,
  /** Cloudinary public ids contain slashes, so this arrives URL-encoded. */
  publicId: z.string().min(1).max(300),
});
