import { z } from 'zod';
import { booleanQuerySchema, csvSchema, paginationSchema, slugSchema } from './common.validators';

export const PRODUCT_SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'name'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * Spec filter syntax: `specs=Poles:3P|Rated Current:100 A`
 * Pipe separates filters, the first colon separates key from value, so values
 * containing colons still work.
 */
const specsSchema = z.string().transform((value) =>
  value
    .split('|')
    .map((pair) => {
      const index = pair.indexOf(':');
      if (index < 1) return null;
      return { key: pair.slice(0, index).trim(), value: pair.slice(index + 1).trim() };
    })
    .filter((item): item is { key: string; value: string } => item !== null && item.value !== ''),
);

export const productQuerySchema = paginationSchema.extend({
  sort: z.enum(PRODUCT_SORTS).default('newest'),
  /** Category slug — matches the category itself and everything beneath it. */
  category: slugSchema.optional(),
  /** One or more brand slugs, comma separated. */
  brand: csvSchema.optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: booleanQuerySchema.optional(),
  pricingMode: z.enum(['retail', 'quote', 'both']).optional(),
  isFeatured: booleanQuerySchema.optional(),
  tags: csvSchema.optional(),
  search: z.string().trim().min(1).max(120).optional(),
  specs: specsSchema.optional(),
})
  .refine(
    (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] },
  );

export type ProductQuery = z.infer<typeof productQuerySchema>;

export const similarQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(24).default(8),
});

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least two characters').max(80),
  limit: z.coerce.number().int().positive().max(15).default(8),
});

export const categoryTreeQuerySchema = z.object({
  /** Include categories with no active products. */
  includeEmpty: booleanQuerySchema.default(true),
  featuredOnly: booleanQuerySchema.default(false),
});

export const brandQuerySchema = z.object({
  featuredOnly: booleanQuerySchema.default(false),
  withCounts: booleanQuerySchema.default(false),
});
