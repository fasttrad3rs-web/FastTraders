import { z } from 'zod';
import {
  booleanQuerySchema,
  csvSchema,
  objectIdSchema,
  paginationSchema,
  slugSchema,
} from './common.validators';

/** Admin product, category, brand and banner payloads. */

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
  /** Internal, like the parent's. Stripped by `toPublicProduct`. */
  price: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  image: z.string().url().optional(),
});

/**
 * A datasheet row typed into the form by hand.
 *
 * Uploaded PDFs come through `POST /products/:id/datasheets`, which sets a real
 * Cloudinary `publicId`. A row pasted into the Datasheets tab has no upload
 * behind it, so it defaults to `manual` — that string is how the media
 * controller knows there is nothing in Cloudinary to delete alongside it.
 */
const datasheetSchema = z.object({
  title: z.string().trim().min(1).max(160),
  url: z.string().url(),
  publicId: z.string().trim().min(1).max(200).default('manual'),
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
    /* Internal figures. Optional — a product can be listed before anyone has
       priced it, which is normal for something imported on request. */
    lastQuotedPrice: z.number().nonnegative().optional(),
    internalCost: z.number().nonnegative().optional(),
    supplierNotes: z.string().trim().max(2000).optional(),
    stock: z.number().int().nonnegative().default(0),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    availability: z.enum(['ready_stock', 'available_on_order', 'import_on_request', 'discontinued']).default('available_on_order'),
    /* Nullable as well as optional, matching `subCategory`: the admin form
       sends `null` for an empty box rather than branching on create vs edit. */
    leadTime: z.string().trim().max(80).nullable().optional(),
    isImportItem: z.boolean().default(false),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).default('piece'),
    minOrderQty: z.number().int().positive().default(1),
    specifications: z.array(specificationSchema).max(60).default([]),
    variants: z.array(variantSchema).max(40).default([]),
    datasheets: z.array(datasheetSchema).max(10).default([]),
    tags: z.array(z.string().trim().max(40)).max(30).default([]),
    warranty: z.string().trim().max(120).optional(),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isActive: z.boolean().default(true),
    seo: seoSchema.optional(),
  })
  .refine((data) => data.availability !== 'ready_stock' || data.stock > 0, {
    message: 'Ready stock needs a stock figure above zero',
    path: ['availability'],
  })
  .refine((data) => !data.isImportItem || Boolean(data.leadTime), {
    message: 'An imported item needs a lead time — it is the first thing a buyer asks',
    path: ['leadTime'],
  });
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Partial update. Same invariants, but only where both fields are present. */
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
    lastQuotedPrice: z.number().nonnegative().nullable().optional(),
    internalCost: z.number().nonnegative().nullable().optional(),
    supplierNotes: z.string().trim().max(2000).nullable().optional(),
    /*
     * `stock` belongs here, and its absence was the second half of the
     * availability bug. The form has a "Stock on hand" box; Zod strips unknown
     * keys silently, so the figure typed into it was discarded on every edit.
     * The product kept `stock: 0`, and `demoteEmptyReadyStock` then quite
     * correctly turned the operator's "Ready Stock" back into "Available on
     * Order" — the save succeeded, and the choice was undone by a rule
     * enforcing an invariant on a number the same request had tried to fix.
     *
     * `POST /products/:id/stock` remains the way to make a *relative*
     * adjustment with a reason. This is the absolute set, and the update
     * controller already audits the whole document before and after, so the
     * trail that endpoint exists to protect is not lost.
     */
    stock: z.number().int().nonnegative().optional(),
    lowStockThreshold: z.number().int().nonnegative().optional(),
    availability: z.enum(['ready_stock', 'available_on_order', 'import_on_request', 'discontinued']).optional(),
    leadTime: z.string().trim().max(80).nullable().optional(),
    isImportItem: z.boolean().optional(),
    unit: z.enum(['piece', 'meter', 'roll', 'box', 'set']).optional(),
    minOrderQty: z.number().int().positive().optional(),
    specifications: z.array(specificationSchema).max(60).optional(),
    variants: z.array(variantSchema).max(40).optional(),
    datasheets: z.array(datasheetSchema).max(10).optional(),
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
    /** Required for `price_adjust`. Adjusts internal figures only. */
    adjust: z
      .object({
        type: z.enum(['percent', 'fixed']),
        /** Negative values reduce the price. */
        value: z.number(),
        field: z.enum(['lastQuotedPrice', 'internalCost']).default('lastQuotedPrice'),
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
  availability: z
    .enum(['ready_stock', 'available_on_order', 'import_on_request', 'discontinued'])
    .optional(),
  isActive: booleanQuerySchema.optional(),
  lowStock: booleanQuerySchema.optional(),
  outOfStock: booleanQuerySchema.optional(),
  tags: csvSchema.optional(),
  sort: z
    .enum(['newest', 'oldest', 'name', 'stock_asc', 'stock_desc', 'sales'])
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
