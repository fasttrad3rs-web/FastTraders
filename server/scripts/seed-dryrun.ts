/* eslint-disable no-console */
/**
 * Offline seed validation.
 *
 *   npx tsx scripts/seed-dryrun.ts
 *
 * Builds every seed document against the real Mongoose schemas and runs
 * `validateSync()` — no database, no network. Catches missing required
 * fields, bad enums and broken references before `npm run seed` writes a
 * half-populated catalogue to Atlas and dies partway through.
 */
import './env-setup';
import { Types } from 'mongoose';
import { Brand, Category, Product, Inquiry, Banner, Setting, User } from '../src/models';
import { brands, categories, products, inquiries, banners, settings } from '../src/seed/data';
import { describeError } from './lib/describe-error';

let failures = 0;
const report = (label: string, error: unknown): void => {
  if (!error) return;
  failures += 1;
  const message = describeError(error);
  console.log(`  FAIL ${label}\n       ${message.slice(0, 220)}`);
};

const catId = new Map(categories.map((c) => [c.slug, new Types.ObjectId()]));
const brandId = new Map(brands.map((b) => [b.slug, new Types.ObjectId()]));

console.log(`\nBrands (${brands.length})`);
for (const b of brands) report(b.slug, new Brand({ ...b }).validateSync());

console.log(`\nCategories (${categories.length})`);
for (const c of categories) {
  report(c.slug, new Category({
    name: c.name, slug: c.slug, description: c.description, icon: c.icon,
    parent: c.parent ? catId.get(c.parent) : null,
    ancestors: [], level: c.parent ? 1 : 0,
    displayOrder: c.displayOrder, isFeatured: c.isFeatured ?? false, isActive: true,
  }).validateSync());
  if (c.parent && !catId.has(c.parent)) report(c.slug, new Error(`unknown parent "${c.parent}"`));
}

console.log(`\nProducts (${products.length})`);
for (const p of products) {
  if (!catId.has(p.category)) report(p.sku, new Error(`unknown category "${p.category}"`));
  if (p.subCategory && !catId.has(p.subCategory)) report(p.sku, new Error(`unknown subCategory "${p.subCategory}"`));
  if (!brandId.has(p.brand)) report(p.sku, new Error(`unknown brand "${p.brand}"`));

  const doc = new Product({
    ...p,
    category: catId.get(p.category), subCategory: p.subCategory ? catId.get(p.subCategory) : null,
    brand: brandId.get(p.brand),
    availability: p.availability ?? (p.stock > 0 ? 'ready_stock' : 'available_on_order'),
    isImportItem: p.isImportItem ?? false,
    images: [{ url: '/x.svg', publicId: 'x', alt: p.name, isPrimary: true }],
    seo: { title: p.name, description: p.shortDescription, keywords: p.tags },
  });
  report(p.sku, doc.validateSync());
}

console.log(`\nInquiries (${inquiries.length})`);
const skus = new Set(products.map((p) => p.sku));
for (const i of inquiries) {
  for (const sku of i.itemSkus ?? []) {
    if (!skus.has(sku)) report(i.customer.name, new Error(`references unknown SKU "${sku}"`));
  }
  const doc = new Inquiry({
    inquiryNumber: 'FT-INQ-202607-0001',
    type: i.type, customer: i.customer, status: i.status, priority: i.priority, source: i.source,
    items: (i.itemSkus ?? []).map((sku) => ({
      product: new Types.ObjectId(), name: 'x', sku, qty: 4, unit: 'piece',
    })),
    ...(i.sourcing ? { sourcingDetails: { ...i.sourcing, referenceFiles: [] } } : {}),
    message: i.message, preferredContactMethod: i.preferredContactMethod ?? 'phone',
    internalQuotedAmount: i.internalQuotedAmount, lostReason: i.lostReason,
    followUps: (i.followUps ?? []).map((f) => ({ note: f.note, by: new Types.ObjectId(), at: new Date() })),
  });
  report(i.customer.name, doc.validateSync());

  // Phone normalisation runs as a schema setter — confirm it fired.
  if (!/^\+92\d{9,11}$/.test(doc.customer.phone)) {
    report(i.customer.name, new Error(`phone did not normalise: "${doc.customer.phone}"`));
  }
}

console.log(`\nBanners (${banners.length}) · Settings · Admin`);
for (const b of banners) report(b.title, new Banner({ ...b, isActive: true }).validateSync());
report('settings', new Setting({ ...settings }).validateSync());
report('admin', new User({
  name: 'Sharjeel Bin Ejaz', email: 'fasttrad3rs@gmail.com',
  phone: '+92 324 4234990', passwordHash: 'x'.repeat(12), role: 'admin', isActive: true,
}).validateSync());

console.log(
  failures === 0
    ? '\nAll seed documents valid. `npm run seed` will not fail on validation.\n'
    : `\n${failures} document(s) would be rejected by MongoDB.\n`,
);
process.exit(failures === 0 ? 0 : 1);
