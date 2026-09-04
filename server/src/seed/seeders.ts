import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Banner, Brand, Category, Product, Setting, User } from '../models';
import { banners, brands, categories, products, settings } from './data';
import type { ProductImage } from '../types';

/**
 * Individual seeders. Each is idempotent: re-running updates existing records
 * (matched on their natural key) rather than duplicating them.
 *
 * The inquiry seeder is the exception and lives in its own file — it clears
 * and rewrites, because its dates are relative.
 */

export { seedInquiries } from './seeders.inquiries';

/** Slug -> ObjectId maps built as we insert, used to resolve references. */
export type SlugMap = Map<string, Types.ObjectId>;

/**
 * Branded placeholder artwork so the storefront renders before the client
 * supplies photography. These are local SVGs served by Next.js — no external
 * placeholder service — and the product SKU is overlaid by the UI.
 */
const PLACEHOLDER_CATEGORIES = new Set([
  'switchgear-protection',
  'circuit-breakers',
  'control-automation',
  'control-components',
  'cables-wiring',
  'power-motors',
  'safety-products',
  'tools-accessories',
]);

function placeholderImages(sku: string, name: string, categorySlug: string): ProductImage[] {
  const file = PLACEHOLDER_CATEGORIES.has(categorySlug) ? categorySlug : 'default';

  return [
    {
      url: `/placeholders/${file}.svg`,
      publicId: `placeholder/${sku.toLowerCase()}`,
      alt: `${name} — product photography pending`,
      isPrimary: true,
    },
  ];
}

/* --------------------------------- Admin -------------------------------- */

export async function seedAdmin(): Promise<void> {
  const email = 'fasttrad3rs@gmail.com';
  const existing = await User.findOne({ email });

  if (existing) {
    logger.info(`[seed] Admin ${email} already exists — skipped`);
    return;
  }

  // Prefer an explicit password; otherwise generate one and print it once.
  const generated = crypto.randomBytes(12).toString('base64url');
  // `||` not `??` — an empty SEED_ADMIN_PASSWORD= line must fall through.
  const password = process.env.SEED_ADMIN_PASSWORD || generated;

  await User.create({
    name: 'Sharjeel Bin Ejaz',
    email,
    phone: '+92 324 4234990',
    passwordHash: password, // hashed by the pre-save hook
    role: 'admin',
    isActive: true,
  });

  logger.info(`[seed] Admin created: ${email}`);
  if (password === generated) {
    logger.warn(`[seed] Generated admin password (shown once): ${password}`);
    logger.warn('[seed] Change it after first login, or set SEED_ADMIN_PASSWORD before seeding.');
  }
}

/* --------------------------------- Brands -------------------------------- */

export async function seedBrands(): Promise<SlugMap> {
  const map: SlugMap = new Map();

  for (const brand of brands) {
    const doc = await Brand.findOneAndUpdate(
      { slug: brand.slug },
      { $set: { ...brand, isActive: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    map.set(brand.slug, doc._id);
  }

  logger.info(`[seed] Brands: ${map.size}`);
  return map;
}

/* ------------------------------- Categories ------------------------------ */

/**
 * Inserted in declaration order so every parent exists before its children.
 * `.save()` is used (not upsert) because the pre-save hook materialises
 * `ancestors` and `level` from the parent chain.
 */
export async function seedCategories(): Promise<SlugMap> {
  const map: SlugMap = new Map();

  for (const category of categories) {
    const parentId = category.parent === null ? null : (map.get(category.parent) ?? null);

    if (category.parent !== null && parentId === null) {
      throw new Error(`Category "${category.slug}" references unknown parent "${category.parent}"`);
    }

    const existing = await Category.findOne({ slug: category.slug });
    const doc = existing ?? new Category({ slug: category.slug });

    doc.set({
      name: category.name,
      description: category.description,
      icon: category.icon,
      parent: parentId,
      displayOrder: category.displayOrder,
      isFeatured: category.isFeatured ?? false,
      isActive: true,
      seo: {
        title: `${category.name} | Fast Traders Lahore`,
        description: category.description,
        keywords: [category.name.toLowerCase(), 'lahore', 'pakistan'],
      },
    });

    // Force the ancestors hook to run even when the parent is unchanged.
    doc.markModified('parent');
    await doc.save();
    map.set(category.slug, doc._id);
  }

  logger.info(`[seed] Categories: ${map.size}`);
  return map;
}

/* -------------------------------- Products ------------------------------- */

export async function seedProducts(
  categoryIds: SlugMap,
  brandIds: SlugMap,
): Promise<number> {
  let count = 0;

  for (const product of products) {
    const categoryId = categoryIds.get(product.category);
    const brandId = brandIds.get(product.brand);
    const subCategoryId = product.subCategory ? categoryIds.get(product.subCategory) : null;

    if (!categoryId) throw new Error(`Product "${product.sku}": unknown category "${product.category}"`);
    if (!brandId) throw new Error(`Product "${product.sku}": unknown brand "${product.brand}"`);
    if (product.subCategory && !subCategoryId) {
      throw new Error(`Product "${product.sku}": unknown subCategory "${product.subCategory}"`);
    }

    const existing = await Product.findOne({ sku: product.sku });
    const doc = existing ?? new Product({ sku: product.sku, slug: product.slug });

    doc.set({
      name: product.name,
      slug: product.slug,
      partNumber: product.partNumber,
      description: product.description,
      shortDescription: product.shortDescription,
      category: categoryId,
      subCategory: subCategoryId,
      brand: brandId,
      // Availability is explicit in the data where it matters; otherwise it
      // follows the stock figure, which is the honest default for a stockist.
      availability:
        product.availability ?? (product.stock > 0 ? 'ready_stock' : 'available_on_order'),
      leadTime: product.leadTime,
      isImportItem: product.isImportItem ?? false,
      lastQuotedPrice: product.lastQuotedPrice,
      internalCost: product.internalCost,
      stock: product.stock,
      unit: product.unit ?? 'piece',
      minOrderQty: product.minOrderQty ?? 1,
      images: existing?.images.length
        ? existing.images
        : placeholderImages(product.sku, product.name, product.subCategory ?? product.category),
      specifications: product.specifications,
      tags: product.tags,
      warranty: product.warranty,
      isFeatured: product.isFeatured ?? false,
      isNewArrival: product.isNewArrival ?? false,
      isBestSeller: product.isBestSeller ?? false,
      isActive: true,
      seo: {
        title: `${product.name} | Fast Traders`,
        description: product.shortDescription,
        keywords: product.tags,
      },
    });

    await doc.save();
    count += 1;
  }

  logger.info(`[seed] Products: ${count}`);
  return count;
}

/* --------------------------------- Banners ------------------------------- */

export async function seedBanners(): Promise<number> {
  for (const banner of banners) {
    await Banner.findOneAndUpdate(
      { title: banner.title },
      { $set: { ...banner, isActive: true } },
      { upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }
  logger.info(`[seed] Banners: ${banners.length}`);
  return banners.length;
}

/* -------------------------------- Settings ------------------------------- */

export async function seedSettings(): Promise<void> {
  await Setting.findOneAndUpdate(
    { key: 'global' },
    { $set: settings },
    { upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );
  logger.info('[seed] Settings: global document written');
}
