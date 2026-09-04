/* eslint-disable no-console */
/**
 * Price-leak audit against the real HTTP surface.
 *
 *   npx tsx scripts/api-audit.ts
 *
 * WHAT THIS IS. The five public endpoints are called through the real Express
 * app — real router, real Zod validation, real controllers, real serialiser,
 * real JSON encoder. The response bodies printed below are the actual bytes
 * those routes emit.
 *
 * WHAT THIS IS NOT. There is no MongoDB: this sandbox's proxy returns 403 for
 * fastdl.mongodb.org, so no binary can be downloaded and no live query can be
 * run. Mongoose's query execution is therefore stubbed, and the stub returns
 * documents built from the real seed data.
 *
 * That substitution makes the audit STRICTER, not weaker. The stub ignores
 * `.select()` entirely and hands every controller the *complete* document,
 * internal figures included — so anything that reaches the response got there
 * because the code put it there, not because a projection happened to hide it.
 * A leak that a projection would have masked in production shows up here.
 *
 * Still unproven and needing a real database: index behaviour, the `$text`
 * and aggregation pipelines, and `select: false` itself.
 */

process.env.PORT ??= '5050';
process.env.JWT_ACCESS_SECRET ??= 'audit_access_secret_at_least_32_characters_long';
process.env.ACCESS_EXPIRY ??= '15m';
process.env.CLIENT_URL ??= 'https://www.fasttraders.co';
process.env.CLOUDINARY_API_KEY ??= 'audit';
process.env.CLOUDINARY_FOLDER ??= 'audit';
process.env.SMTP_PORT ??= '587';
process.env.SMTP_USER ??= 'audit@example.com';
process.env.SMTP_FROM ??= 'Fast Traders <audit@example.com>';
process.env.LOG_LEVEL ??= 'error';
process.env.RATE_LIMIT_MAX ??= '100000';

// Must be first: it seeds process.env before the app's Zod check runs.
import './env-setup';

import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { Brand, Category, Product } from '../src/models';
import { brands, categories, products } from '../src/seed/data';

/* ------------------------- Seed data -> documents ------------------------ */

const categoryIds = new Map(categories.map((category) => [category.slug, new Types.ObjectId()]));
const brandIds = new Map(brands.map((brand) => [brand.slug, new Types.ObjectId()]));

const brandDocs = brands.map((brand) => ({
  _id: brandIds.get(brand.slug),
  name: brand.name,
  slug: brand.slug,
  country: brand.country,
  logo: '',
  isActive: true,
  displayOrder: brand.displayOrder,
}));

const categoryDocs = categories.map((category) => ({
  _id: categoryIds.get(category.slug),
  name: category.name,
  slug: category.slug,
  parent: category.parent ? categoryIds.get(category.parent) : null,
  ancestors: [],
  level: category.parent ? 1 : 0,
  displayOrder: category.displayOrder,
  isActive: true,
  isFeatured: category.isFeatured ?? false,
  description: category.description,
}));

/**
 * Full documents, with every internal figure present. The point is that the
 * response must not contain them even though the "database" returned them.
 */
const productDocs = products.map((product, index) => ({
  _id: new Types.ObjectId(),
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  partNumber: product.partNumber,
  description: product.description,
  shortDescription: product.shortDescription,
  category: categoryDocs.find((c) => c.slug === product.category) ?? null,
  subCategory: product.subCategory
    ? (categoryDocs.find((c) => c.slug === product.subCategory) ?? null)
    : null,
  brand: brandDocs.find((b) => b.slug === product.brand) ?? null,

  lastQuotedPrice: product.lastQuotedPrice,
  internalCost: product.internalCost,
  supplierNotes: `Supplier: Nakamura Trading. MOQ 5. Cost reviewed ${index % 12}/2026.`,
  stock: product.stock,
  lowStockThreshold: 5,

  availability: product.availability ?? 'available_on_order',
  leadTime: product.leadTime,
  isImportItem: product.isImportItem ?? false,

  unit: product.unit ?? 'piece',
  minOrderQty: product.minOrderQty ?? 1,
  images: [
    {
      url: `/placeholders/default.svg`,
      publicId: `placeholder/${product.sku.toLowerCase()}`,
      alt: product.name,
      isPrimary: true,
    },
  ],
  specifications: product.specifications,
  variants: [
    { name: 'Standard', sku: `${product.sku}-STD`, attributes: {}, price: product.lastQuotedPrice, stock: 3 },
  ],
  datasheets: [],
  tags: product.tags,
  warranty: product.warranty,
  isFeatured: product.isFeatured ?? false,
  isNewArrival: product.isNewArrival ?? false,
  isBestSeller: product.isBestSeller ?? false,
  isActive: true,
  viewCount: 40 + index,
  salesCount: index,
  seo: { title: `${product.name} | Fast Traders`, description: product.shortDescription, keywords: product.tags },
  createdAt: new Date('2026-01-15T09:00:00.000Z'),
  updatedAt: new Date('2026-06-01T09:00:00.000Z'),
}));

/* ---------------------------- Mongoose stubbing --------------------------- */

/**
 * A chainable stand-in for a Mongoose Query.
 *
 * `select` is deliberately a no-op: see the header. Every other link in the
 * chain behaves the way the controllers expect it to.
 */
function fakeQuery<T>(rows: T[]): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'populate', 'sort', 'skip', 'limit', 'lean', 'collation']) {
    query[method] = () => query;
  }
  query.then = (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve);
  query.exec = () => Promise.resolve(rows);
  return query;
}

function fakeOne<T>(row: T | null): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'populate', 'sort', 'lean']) {
    query[method] = () => query;
  }
  query.then = (resolve: (value: T | null) => unknown) => Promise.resolve(row).then(resolve);
  query.exec = () => Promise.resolve(row);
  return query;
}

type AnyFn = (...args: unknown[]) => unknown;

function stub(model: object, method: string, impl: AnyFn): void {
  (model as Record<string, unknown>)[method] = impl;
}

function applyFilter(filter: Record<string, unknown>): typeof productDocs {
  let rows = productDocs;
  const or = filter.$or as { sku?: RegExp; partNumber?: RegExp; name?: RegExp }[] | undefined;
  if (or) {
    rows = rows.filter((product) =>
      or.some(
        (clause) =>
          (clause.sku instanceof RegExp && clause.sku.test(product.sku)) ||
          (clause.partNumber instanceof RegExp && clause.partNumber.test(product.partNumber ?? '')) ||
          (clause.name instanceof RegExp && clause.name.test(product.name)),
      ),
    );
  }
  return rows;
}

/*
 * `AnyFn` takes `unknown[]`, so a stub cannot narrow its own parameter — the
 * contravariance is the point, and TypeScript was right to object. Each stub
 * accepts what the type promises and narrows inside.
 *
 * Neither error was ever reported: `scripts/` belonged to no tsconfig, so
 * `tsc` never looked here. `tsconfig.scripts.json` now covers it.
 */
const asFilter = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

stub(Product, 'find', (...args: unknown[]) => fakeQuery(applyFilter(asFilter(args[0]))));
stub(Product, 'findOne', (...args: unknown[]) => {
  const slug = asFilter(args[0]).slug;
  return fakeOne(
    productDocs.find((product) => product.slug === slug) ?? productDocs[0] ?? null,
  );
});
stub(Product, 'findById', () => fakeOne(productDocs[0] ?? null));
stub(Product, 'countDocuments', () => Promise.resolve(productDocs.length));
stub(Product, 'updateOne', () => Promise.resolve({ acknowledged: true }));
stub(Product, 'aggregate', () => Promise.resolve([]));

stub(Category, 'find', () => fakeQuery(categoryDocs));
stub(Category, 'findOne', () => fakeOne(categoryDocs[0] ?? null));
stub(Category, 'aggregate', () => Promise.resolve([]));

stub(Brand, 'find', () => fakeQuery(brandDocs));
stub(Brand, 'aggregate', () => Promise.resolve([]));

/* --------------------------------- Audit ---------------------------------- */

/**
 * Forbidden as JSON *keys*, plus the two currency markers as literal text.
 *
 * Bare `stock` cannot be a substring test: `ready_stock` is a legitimate
 * enum value that contains it. `cost` cannot either — "cost" appears in
 * product prose. So keys are matched as keys, and only `Rs`/`PKR` are matched
 * as text, where any occurrence at all would be a genuine price rendering.
 */
const FORBIDDEN_KEYS = [
  'price',
  'lastQuotedPrice',
  'internalCost',
  'costPrice',
  'cost',
  'stock',
  'supplierNotes',
  'salesCount',
  'lowStockThreshold',
];

const FORBIDDEN_TEXT = [/\bRs\.?\s?\d/, /\bPKR\b/];

function collectKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) collectKeys(entry, found);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      found.add(key);
      collectKeys(nested, found);
    }
  }
  return found;
}

interface Finding {
  endpoint: string;
  kind: string;
  detail: string;
}

const findings: Finding[] = [];

function audit(endpoint: string, text: string): void {
  const parsed: unknown = JSON.parse(text);
  const keys = collectKeys(parsed);

  for (const key of FORBIDDEN_KEYS) {
    if (keys.has(key)) findings.push({ endpoint, kind: 'KEY', detail: key });
  }
  for (const pattern of FORBIDDEN_TEXT) {
    const match = pattern.exec(text);
    if (match) findings.push({ endpoint, kind: 'TEXT', detail: match[0] });
  }
}

async function main(): Promise<void> {
  const app = createApp();
  const slug = productDocs[0]?.slug ?? '';

  const calls: [string, string][] = [
    ['GET /api/v1/products?limit=3', '/api/v1/products?limit=3'],
    [`GET /api/v1/products/${slug}`, `/api/v1/products/${slug}`],
    ['GET /api/v1/categories', '/api/v1/categories'],
    ['GET /api/v1/brands', '/api/v1/brands'],
    ['GET /api/v1/search/suggest?q=mccb', '/api/v1/search/suggest?q=mccb'],
  ];

  for (const [label, path] of calls) {
    const response = await request(app).get(path);

    console.log(`\n${'='.repeat(78)}`);
    console.log(`${label}   ->   ${response.status}`);
    console.log('='.repeat(78));
    console.log(JSON.stringify(JSON.parse(response.text), null, 2));

    audit(label, response.text);
  }

  console.log(`\n${'='.repeat(78)}`);
  console.log('GREP RESULTS: price / cost / stock / Rs / PKR / supplier');
  console.log('='.repeat(78));

  if (findings.length === 0) {
    console.log('No hits. None of the forbidden keys or currency markers appear in any body.');
  } else {
    for (const finding of findings) {
      console.log(`HIT  ${finding.endpoint}  [${finding.kind}]  ${finding.detail}`);
    }
  }

  process.exit(findings.length === 0 ? 0 : 1);
}

void main();
