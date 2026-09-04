import type { FilterQuery, Types } from 'mongoose';
import { Product, type IProduct } from '../models';
import { ApiError } from '../utils/ApiError';
import { buildMeta, toSkip, type PaginationMeta } from '../utils/pagination';
import { buildFacets, type ProductFacets } from './catalog.facets';
import { LIST_PROJECTION, buildProductFilter, buildSort, resolveRefs } from './catalog.filter';
import type { ProductQuery } from '../validators';
import type { Availability } from '../types';

/**
 * Product read operations for the public catalogue.
 *
 * These return raw rows. Serialisation to the public shape is the
 * controller's job (`toPublicProduct`), so a service can still be reused by
 * an admin caller that legitimately needs the whole document.
 */

export type LeanProduct = IProduct & { _id: Types.ObjectId };

const POPULATE_REFS = [
  { path: 'category', select: 'name slug' },
  { path: 'subCategory', select: 'name slug' },
  { path: 'brand', select: 'name slug logo' },
];

export interface ProductListResult {
  items: LeanProduct[];
  meta: PaginationMeta;
  facets: ProductFacets;
}

export async function listProducts(query: ProductQuery): Promise<ProductListResult> {
  const refs = await resolveRefs(query);
  const filter = buildProductFilter(query, refs);
  const sort = buildSort(query.sort, Boolean(query.search));

  const [items, total, facets] = await Promise.all([
    // Mongo adds the textScore projection implicitly when sorting by $meta.
    Product.find(filter)
      .select(LIST_PROJECTION)
      .populate(POPULATE_REFS)
      .sort(sort)
      .skip(toSkip(query.page, query.limit))
      .limit(query.limit)
      .lean<LeanProduct[]>(),
    Product.countDocuments(filter),
    buildFacets(query, refs),
  ]);

  return { items, meta: buildMeta(total, query.page, query.limit), facets };
}

/**
 * Full product detail plus siblings from the same category.
 * `viewCount` is bumped without awaiting so the read stays fast.
 */
export async function getProductBySlug(
  slug: string,
): Promise<{ product: LeanProduct; related: LeanProduct[] }> {
  const product = await Product.findOne({ slug, isActive: true })
    .populate(POPULATE_REFS)
    .lean<LeanProduct>();

  if (!product) throw ApiError.notFound('Product not found');

  void Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } }).catch(() => undefined);

  const related = await findRelated(product, 8);
  return { product, related };
}

/** Same subcategory first, then same category, then same brand. */
async function findRelated(product: LeanProduct, limit: number): Promise<LeanProduct[]> {
  const base = { _id: { $ne: product._id }, isActive: true };

  const tiers: FilterQuery<IProduct>[] = [
    ...(product.subCategory ? [{ ...base, subCategory: product.subCategory }] : []),
    { ...base, category: product.category },
    { ...base, brand: product.brand },
  ];

  const found = new Map<string, LeanProduct>();

  for (const tier of tiers) {
    if (found.size >= limit) break;

    const batch = await Product.find(tier)
      .select(LIST_PROJECTION)
      .populate(POPULATE_REFS)
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit)
      .lean<LeanProduct[]>();

    for (const item of batch) {
      if (found.size >= limit) break;
      found.set(item._id.toString(), item);
    }
  }

  return [...found.values()];
}

export async function getSimilarProducts(id: string, limit: number): Promise<LeanProduct[]> {
  const product = await Product.findById(id)
    .select('category subCategory brand tags')
    .lean<LeanProduct>();

  if (!product) throw ApiError.notFound('Product not found');
  return findRelated(product, limit);
}

export interface Suggestion {
  id: string;
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  image?: string;
  availability: Availability;
}

/**
 * Autocomplete. Prefix-matches SKU and part number first (a trade buyer
 * pasting "LC1D18" expects an exact hit), then falls back to name.
 */
export async function suggest(term: string, limit: number): Promise<Suggestion[]> {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = new RegExp(`^${escaped}`, 'i');
  const contains = new RegExp(escaped, 'i');

  const products = await Product.find({
    isActive: true,
    $or: [{ sku: prefix }, { partNumber: prefix }, { name: contains }],
  })
    .select('name slug sku partNumber images availability salesCount')
    .sort({ salesCount: -1, name: 1 })
    .limit(limit)
    .lean<LeanProduct[]>();

  return products.map((product) => ({
    id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    ...(product.partNumber ? { partNumber: product.partNumber } : {}),
    ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
    availability: product.availability ?? 'available_on_order',
  }));
}
