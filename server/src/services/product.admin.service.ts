import { Types } from 'mongoose';
import { Brand, Category, Product, type IProduct, type ProductDocument } from '../models';
import { ApiError } from '../utils/ApiError';
import { uniqueSlug } from '../utils/slug';
import type { BulkProductInput, CreateProductInput, StockAdjustmentInput, UpdateProductInput } from '../validators';

/** Admin write operations on the catalogue. */

/** Reject references to categories or brands that do not exist. */
async function assertRefs(categoryId?: string, subCategoryId?: string | null, brandId?: string): Promise<void> {
  const checks: Promise<void>[] = [];

  if (categoryId) {
    checks.push(
      Category.exists({ _id: categoryId }).then((found) => {
        if (!found) throw ApiError.badRequest('The selected category does not exist');
      }),
    );
  }
  if (subCategoryId) {
    checks.push(
      Category.exists({ _id: subCategoryId }).then((found) => {
        if (!found) throw ApiError.badRequest('The selected sub-category does not exist');
      }),
    );
  }
  if (brandId) {
    checks.push(
      Brand.exists({ _id: brandId }).then((found) => {
        if (!found) throw ApiError.badRequest('The selected brand does not exist');
      }),
    );
  }

  await Promise.all(checks);
}

export async function createProduct(input: CreateProductInput): Promise<ProductDocument> {
  if (await Product.exists({ sku: input.sku })) {
    throw ApiError.conflict(`SKU "${input.sku}" is already in use`);
  }
  await assertRefs(input.category, input.subCategory, input.brand);

  const slug = input.slug ?? (await uniqueSlug(Product, input.name));

  return Product.create({
    ...input,
    slug,
    subCategory: input.subCategory ? new Types.ObjectId(input.subCategory) : null,
    category: new Types.ObjectId(input.category),
    brand: new Types.ObjectId(input.brand),
  });
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDocument> {
  const product = await Product.findById(id).select('+costPrice');
  if (!product) throw ApiError.notFound('Product not found');

  if (input.sku && input.sku !== product.sku) {
    if (await Product.exists({ sku: input.sku, _id: { $ne: id } })) {
      throw ApiError.conflict(`SKU "${input.sku}" is already in use`);
    }
  }
  await assertRefs(input.category, input.subCategory, input.brand);

  // Renaming regenerates the slug unless one was supplied explicitly.
  if (input.slug) {
    product.slug = input.slug;
  } else if (input.name && input.name !== product.name) {
    product.slug = await uniqueSlug(Product, input.name, id);
  }

  const { slug: _slug, subCategory, category, brand, ...rest } = input;

  for (const [key, value] of Object.entries(rest)) {
    // `null` from the client means "clear this optional field".
    product.set(key, value === null ? undefined : value);
  }
  if (subCategory !== undefined) {
    product.subCategory = subCategory ? new Types.ObjectId(subCategory) : null;
  }
  if (category) product.category = new Types.ObjectId(category);
  if (brand) product.brand = new Types.ObjectId(brand);

  // Guard the hybrid-commerce invariant across partial updates.
  if (product.pricingMode !== 'quote' && typeof product.price !== 'number') {
    throw ApiError.badRequest('A price is required unless the product is quote-only');
  }

  await product.save();
  return product;
}

/** Soft delete — history and order lines must keep resolving. */
export async function softDeleteProduct(id: string): Promise<ProductDocument> {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  product.isActive = false;
  await product.save();
  return product;
}

/* ------------------------------ Stock control ---------------------------- */

export interface StockChange {
  product: ProductDocument;
  previous: number;
  next: number;
}

export async function adjustStock(id: string, input: StockAdjustmentInput): Promise<StockChange> {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  const previous = product.stock;
  const next =
    input.mode === 'set'
      ? input.quantity
      : input.mode === 'increment'
        ? previous + input.quantity
        : previous - input.quantity;

  if (next < 0) {
    throw ApiError.badRequest(`Cannot remove ${input.quantity} — only ${previous} in stock`);
  }

  product.stock = next;
  // The model's pre-save hook re-derives stockStatus from the new figure.
  await product.save();

  return { product, previous, next };
}

/* ----------------------------- Bulk operations --------------------------- */

export interface BulkResult {
  action: string;
  matched: number;
  modified: number;
}

function round(value: number, roundTo: number): number {
  if (roundTo <= 0) return Math.round(value * 100) / 100;
  return Math.round(value / roundTo) * roundTo;
}

export async function bulkUpdate(input: BulkProductInput): Promise<BulkResult> {
  const ids = input.ids.map((id) => new Types.ObjectId(id));
  const filter = { _id: { $in: ids } };

  const simple: Record<string, Partial<IProduct>> = {
    activate: { isActive: true },
    deactivate: { isActive: false },
    delete: { isActive: false }, // soft delete
    feature: { isFeatured: true },
    unfeature: { isFeatured: false },
  };

  const patch = simple[input.action];
  if (patch) {
    const result = await Product.updateMany(filter, { $set: patch });
    return { action: input.action, matched: result.matchedCount, modified: result.modifiedCount };
  }

  // Price adjustment: read, compute, write — the maths is too conditional for
  // an aggregation pipeline update and these batches are small.
  const adjust = input.adjust;
  if (!adjust) throw ApiError.badRequest('A price adjustment needs an `adjust` block');

  const products = await Product.find(filter).select('+costPrice');
  let modified = 0;

  for (const product of products) {
    const current: unknown = product.get(adjust.field);
    if (typeof current !== 'number') continue;

    const delta = adjust.type === 'percent' ? (current * adjust.value) / 100 : adjust.value;
    const next = round(Math.max(0, current + delta), adjust.roundTo);

    if (next === current) continue;
    product.set(adjust.field, next);
    await product.save();
    modified += 1;
  }

  return { action: input.action, matched: products.length, modified };
}
