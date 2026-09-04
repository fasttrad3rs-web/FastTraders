import { Types } from 'mongoose';
import {
  Brand,
  Category,
  Inquiry,
  InquiryList,
  Product,
  type IProduct,
  type ProductDocument,
} from '../models';
import { ApiError } from '../utils/ApiError';
import { deleteImage } from './upload.service';
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
    /*
     * Existence is not enough — the sub-category must be a CHILD of the chosen
     * category. The admin form used to offer every nested category regardless
     * of parent, so a product could be filed under "Control Components" with a
     * sub-category of "Sensors", which lives under Automation. The record
     * saved, and then the category page showed no chip for it and the
     * sub-category filter matched nothing: the product was effectively
     * invisible under the taxonomy it claimed to belong to.
     */
    checks.push(
      Category.findById(subCategoryId)
        .select('parent name')
        .lean<{ parent?: Types.ObjectId | null; name: string } | null>()
        .then((child) => {
          if (!child) throw ApiError.badRequest('The selected sub-category does not exist');
          if (!categoryId) return;

          if (String(child.parent ?? '') !== String(categoryId)) {
            throw ApiError.badRequest(
              `"${child.name}" is not a sub-category of the category you selected`,
            );
          }
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
  const product = await Product.findById(id).select('+lastQuotedPrice +internalCost +supplierNotes +variants.price');
  if (!product) throw ApiError.notFound('Product not found');

  if (input.sku && input.sku !== product.sku) {
    if (await Product.exists({ sku: input.sku, _id: { $ne: id } })) {
      throw ApiError.conflict(`SKU "${input.sku}" is already in use`);
    }
  }
  /*
   * The effective category, not just what the patch carries. A patch that sets
   * only `subCategory` still has to be checked against the category already on
   * the product, or the parentage rule is trivially bypassed by editing the
   * two fields in separate requests.
   */
  await assertRefs(
    input.category ?? String(product.category),
    input.subCategory,
    input.brand,
  );

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

  await product.save();
  return product;
}

/** Soft delete — history and inquiry lines must keep resolving. */
export async function softDeleteProduct(id: string): Promise<ProductDocument> {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  product.isActive = false;
  await product.save();
  return product;
}

/**
 * Permanent delete. Gone from the database, gone from Cloudinary.
 *
 * This exists because the admin previously had no way to remove anything. The
 * `⋯` menu offered "Delete", which did exactly what the Active toggle does —
 * set `isActive: false` — so a mistyped SKU or a product created for testing
 * stayed in the catalogue for good, and an operator who clicked a button
 * labelled Delete was told the opposite of what happened.
 *
 * **Refuses when the product appears in any inquiry.** An inquiry line records
 * what a customer asked for and what was quoted; deleting the product out from
 * under it would leave a row pointing at nothing, and the pipeline history is
 * the accumulated commercial value of this system. Deactivation is the correct
 * answer there, and the error says so rather than failing mutely.
 */
export async function purgeProduct(id: string): Promise<{ name: string; images: number }> {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found');

  const [inInquiry, inList] = await Promise.all([
    Inquiry.countDocuments({ 'items.product': id }),
    InquiryList.countDocuments({ 'items.product': id }),
  ]);

  if (inInquiry > 0) {
    throw ApiError.conflict(
      `"${product.name}" appears in ${inInquiry} inquir${inInquiry === 1 ? 'y' : 'ies'} and cannot be ` +
        'deleted — that history would be left pointing at nothing. Turn it off with the Active ' +
        'toggle instead: it disappears from the storefront and the record stays intact.',
    );
  }

  // A visitor's shortlist is not history; it is a basket in progress. Pulling
  // the item out of it is kinder than refusing the delete forever.
  if (inList > 0) {
    await InquiryList.updateMany(
      { 'items.product': id },
      { $pull: { items: { product: new Types.ObjectId(id) } } },
    );
  }

  /*
   * Cloudinary before Mongo. If the storage call fails we still have the
   * document and can retry; delete the document first and the public IDs are
   * lost, leaving files nobody can find and nobody is paying attention to.
   */
  const publicIds = product.images.map((image) => image.publicId).filter(Boolean);
  await Promise.all(publicIds.map((publicId) => deleteImage(publicId).catch(() => undefined)));

  await product.deleteOne();

  return { name: product.name, images: publicIds.length };
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
  // The model's pre-save hook demotes `ready_stock` if this empties it.
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

  const products = await Product.find(filter).select('+lastQuotedPrice +internalCost +supplierNotes +variants.price');
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
