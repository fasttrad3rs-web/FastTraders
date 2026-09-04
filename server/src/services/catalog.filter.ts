import type { FilterQuery, Types } from 'mongoose';
import { Brand, Category, type IProduct } from '../models';
import { ApiError } from '../utils/ApiError';
import type { ProductQuery } from '../validators';

/**
 * Translates the public product query string into a Mongo filter.
 *
 * `omit` lets the facet builder drop one dimension so that, for example, the
 * brand facet still shows every brand available under the current category
 * rather than only the brand already selected.
 */

export type FilterDimension = 'category' | 'brand' | 'availability';

export interface ResolvedRefs {
  /** The category plus every descendant, so a parent shows the whole subtree. */
  categoryIds: Types.ObjectId[];
  brandIds: Types.ObjectId[];
}

/** Resolve a category slug to itself + all descendants. */
export async function resolveCategoryIds(slug?: string): Promise<Types.ObjectId[]> {
  if (!slug) return [];

  const category = await Category.findOne({ slug, isActive: true }).select('_id').lean<{
    _id: Types.ObjectId;
  }>();
  if (!category) throw ApiError.notFound(`Category "${slug}" not found`);

  const descendants = await Category.find({ ancestors: category._id, isActive: true })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  return [category._id, ...descendants.map((item) => item._id)];
}

export async function resolveBrandIds(slugs?: string[]): Promise<Types.ObjectId[]> {
  if (!slugs || slugs.length === 0) return [];

  const brands = await Brand.find({ slug: { $in: slugs }, isActive: true })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  if (brands.length === 0) throw ApiError.notFound('No matching brand was found');
  return brands.map((brand) => brand._id);
}

export async function resolveRefs(query: ProductQuery): Promise<ResolvedRefs> {
  const [categoryIds, brandIds] = await Promise.all([
    resolveCategoryIds(query.category),
    resolveBrandIds(query.brand),
  ]);
  return { categoryIds, brandIds };
}

export function buildProductFilter(
  query: ProductQuery,
  refs: ResolvedRefs,
  omit: FilterDimension[] = [],
): FilterQuery<IProduct> {
  const filter: FilterQuery<IProduct> = { isActive: true };
  const skip = new Set(omit);

  if (!skip.has('category') && refs.categoryIds.length > 0) {
    // A product matches if the slug hits either its category or its subCategory.
    filter.$or = [
      { category: { $in: refs.categoryIds } },
      { subCategory: { $in: refs.categoryIds } },
    ];
  }

  if (!skip.has('brand') && refs.brandIds.length > 0) {
    filter.brand = { $in: refs.brandIds };
  }

  /*
   * No price filter. A `minPrice`/`maxPrice` range over a hidden field is an
   * oracle: a dozen requests would binary-search any product's exact price.
   * `availability` replaces it as the second facetable dimension, and it is
   * the question a trade buyer was asking anyway — can I collect it today?
   */
  if (!skip.has('availability') && query.availability) {
    filter.availability = query.availability;
  }
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
  // Only ever narrows. `isImportItem=false` would hide the import catalogue,
  // which nobody is asking for, so an explicit false is treated as "no filter".
  if (query.isImportItem === true) filter.isImportItem = true;
  if (query.tags && query.tags.length > 0) filter.tags = { $all: query.tags };

  if (query.search) filter.$text = { $search: query.search };

  // Every spec filter must match a different element of `specifications`.
  if (query.specs && query.specs.length > 0) {
    filter.$and = query.specs.map((spec) => ({
      specifications: { $elemMatch: { key: spec.key, value: spec.value } },
    }));
  }

  return filter;
}

/** Sort stage for each public sort option. */
export type SortSpec = Record<string, 1 | -1 | { $meta: 'textScore' }>;

export function buildSort(sort: ProductQuery['sort'], hasSearch: boolean): SortSpec {
  if (hasSearch && sort === 'newest') {
    // Relevance first when the user actually typed something.
    return { score: { $meta: 'textScore' as const }, createdAt: -1 };
  }

  switch (sort) {
    case 'popular':
      return { salesCount: -1, viewCount: -1, _id: 1 };
    case 'name_asc':
      return { name: 1, _id: 1 };
    case 'name_desc':
      return { name: -1, _id: 1 };
    case 'newest':
    default:
      return { createdAt: -1, _id: 1 };
  }
}

/**
 * Public list projection.
 *
 * A second line of defence, not the guard — `toPublicProduct` is the guard.
 * It is kept because fetching less over the wire from Mongo is worth having,
 * and because naming a path here OVERRIDES `select: false` on the schema, so
 * this string is exactly where an internal field would sneak back in.
 */
export const LIST_PROJECTION =
  'name slug sku partNumber shortDescription category subCategory brand ' +
  'availability leadTime isImportItem unit minOrderQty images tags ' +
  'isFeatured isNewArrival isBestSeller viewCount seo createdAt';
