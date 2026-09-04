import { z } from 'zod';
import {
  booleanQuerySchema,
  imageRefSchema,
  objectIdSchema,
  slugSchema,
} from './common.validators';

/** Category, brand, banner and coupon payloads. */

const seoSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(180).optional(),
  keywords: z.array(z.string().trim().max(60)).max(20).default([]),
});

/* ------------------------------- Categories ------------------------------ */

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(1000).optional(),
  image: imageRefSchema.optional(),
  /** Lucide icon name shown in the mega-menu. */
  icon: z.string().trim().max(60).optional(),
  parent: objectIdSchema.nullable().default(null),
  displayOrder: z.number().int().nonnegative().default(0),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  seo: seoSchema.optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/*
 * Explicit, not `.partial()`. See `updateBrandSchema` for why: optional but
 * not nullable means a description or an icon can be set and never removed.
 * `parent: null` is especially load-bearing — it is how a nested category is
 * promoted back to the top level.
 */
export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    image: imageRefSchema.nullable().optional(),
    icon: z.string().trim().max(60).nullable().optional(),
    parent: objectIdSchema.nullable().optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    seo: seoSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

/* --------------------------------- Brands -------------------------------- */

export const createBrandSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema.optional(),
  logo: imageRefSchema.optional(),
  description: z.string().trim().max(1000).optional(),
  country: z.string().trim().max(60).optional(),
  website: z.string().url().optional(),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

/*
 * Written out rather than `createBrandSchema.partial()`.
 *
 * `.partial()` makes every field optional but not nullable, so there was no
 * value the admin could send to *clear* a logo, a website or a country — the
 * update schema could only ever set them. `null` now means "unset this",
 * matching what `updateBannerSchema` already did.
 */
export const updateBrandSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: slugSchema.optional(),
    logo: imageRefSchema.nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    country: z.string().trim().max(60).nullable().optional(),
    website: z.string().url().nullable().optional(),
    isFeatured: z.boolean().optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

/* -------------------------------- Banners -------------------------------- */

export const createBannerSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    subtitle: z.string().trim().max(300).optional(),
    image: imageRefSchema,
    mobileImage: imageRefSchema.optional(),
    link: z.string().trim().max(300).optional(),
    ctaText: z.string().trim().max(40).optional(),
    position: z.enum(['hero', 'strip', 'sidebar']).default('hero'),
    displayOrder: z.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.endsAt > data.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });
export type CreateBannerInput = z.infer<typeof createBannerSchema>;

export const updateBannerSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    subtitle: z.string().trim().max(300).nullable().optional(),
    image: imageRefSchema.optional(),
    mobileImage: imageRefSchema.nullable().optional(),
    link: z.string().trim().max(300).nullable().optional(),
    ctaText: z.string().trim().max(40).nullable().optional(),
    position: z.enum(['hero', 'strip', 'sidebar']).optional(),
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

/* -------------------------------- Coupons -------------------------------- */

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, 'Letters, digits, hyphens and underscores only'),
    type: z.enum(['percent', 'fixed']),
    value: z.number().positive(),
    minOrder: z.number().nonnegative().default(0),
    maxDiscount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    validFrom: z.coerce.date().default(() => new Date()),
    validTo: z.coerce.date(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.type !== 'percent' || data.value <= 100, {
    message: 'A percentage discount cannot exceed 100',
    path: ['value'],
  })
  .refine((data) => data.validTo > data.validFrom, {
    message: 'validTo must be after validFrom',
    path: ['validTo'],
  });
export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = z
  .object({
    type: z.enum(['percent', 'fixed']).optional(),
    value: z.number().positive().optional(),
    minOrder: z.number().nonnegative().optional(),
    maxDiscount: z.number().positive().nullable().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

/* -------------------------------- Reorder -------------------------------- */

/** Drag-and-drop reordering: the client posts the ids in their new order. */
export const reorderSchema = z.object({
  items: z
    .array(z.object({ id: objectIdSchema, displayOrder: z.number().int().nonnegative() }))
    .min(1)
    .max(500),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

export const taxonomyQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  isActive: booleanQuerySchema.optional(),
  parent: objectIdSchema.nullable().optional(),
  position: z.enum(['hero', 'strip', 'sidebar']).optional(),
});
