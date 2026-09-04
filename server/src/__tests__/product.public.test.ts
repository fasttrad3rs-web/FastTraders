import request from 'supertest';
import { Types } from 'mongoose';
import { createApp } from '../app';
import { Product } from '../models';
import type { LeanProduct, ProductListResult } from '../services/catalog.service';
import type { PublicProduct } from '../models/Product.public';
import { envelope } from './helpers/envelope';

/**
 * Public product endpoints must not leak internal fields.
 *
 * The service layer is stubbed to hand the controller a product that is
 * *deliberately full* of staff data — internal cost, last quoted price, stock
 * counts, supplier notes, variant prices. If the controller forgets to
 * serialise, or somebody widens the whitelist, this fails.
 *
 * Asserting on the response body as a whole rather than on named properties
 * is the point: a leak nested three levels deep inside `variants` or a
 * populated ref would slip past `expect(body.product.stock).toBeUndefined()`.
 */

jest.mock('../services/catalog.service', () => ({
  listProducts: jest.fn(),
  getProductBySlug: jest.fn(),
  getSimilarProducts: jest.fn(),
  suggest: jest.fn(),
}));

import * as catalog from '../services/catalog.service';

const mocked = catalog as jest.Mocked<typeof catalog>;

/** Every field a staff member can see, so the test has something to fail on. */
function buildProduct(): LeanProduct {
  return {
    _id: new Types.ObjectId('64b7c0de1234567890abcdef'),
    name: 'Terasaki S250-NJ MCCB 250A 36kA 3P',
    slug: 'terasaki-s250-nj-250a',
    sku: 'TER-S250NJ',
    partNumber: 'S250-NJ-250',
    description: '<p>Moulded case circuit breaker.</p>',
    shortDescription: 'Japanese-built MCCB for panel builders.',

    category: { _id: new Types.ObjectId(), name: 'Circuit Breakers', slug: 'circuit-breakers' },
    subCategory: null,
    brand: { _id: new Types.ObjectId(), name: 'Terasaki', slug: 'terasaki', logo: '' },

    // ---- everything below here is staff-only ----
    lastQuotedPrice: 48_500,
    internalCost: 39_200,
    supplierNotes: 'Nakamura-san quoted FOB Osaka, MOQ 5. Chase before Ramadan.',
    stock: 12,
    lowStockThreshold: 3,

    availability: 'ready_stock',
    leadTime: '2-3 days',
    isImportItem: false,

    unit: 'piece',
    minOrderQty: 1,

    images: [{ url: 'https://cdn.example.com/a.jpg', publicId: 'a', alt: '', isPrimary: true }],
    specifications: [{ key: 'Rated Current', value: '250 A', group: 'Electrical' }],
    variants: [
      {
        name: '3P 250A',
        sku: 'TER-S250NJ-3P',
        attributes: { poles: '3P' },
        price: 48_500,
        stock: 4,
      },
    ],
    datasheets: [],

    tags: ['mccb', 'terasaki'],
    warranty: '12 months',
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    isActive: true,

    viewCount: 42,
    salesCount: 7,

    seo: { title: 'Terasaki S250-NJ', description: 'MCCB', keywords: ['mccb'] },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
  } as unknown as LeanProduct;
}

/** Field names that must never reach a browser. */
const FORBIDDEN = [
  'internalCost',
  'lastQuotedPrice',
  'stock',
  'supplierNotes',
  'costPrice',
  'price',
] as const;

/**
 * Two passes, because neither alone is enough.
 *
 * A bare substring search on the response text would flag `"ready_stock"` —
 * a legitimate enum *value* that happens to contain "stock" — so the text
 * pass looks for JSON *keys* (`"stock":`) rather than loose occurrences.
 *
 * The key walk then recurses the parsed body, which catches a leak nested
 * inside `variants` or a populated ref where a top-level property assertion
 * would never look.
 */
function collectKeys(value: unknown, found: Set<string> = new Set()): Set<string> {
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

function expectNoLeak(payload: unknown): void {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const parsed: unknown = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const keys = collectKeys(parsed);

  for (const field of FORBIDDEN) {
    expect(text).not.toContain(`"${field}":`);
    expect([...keys]).not.toContain(field);
  }
}

const app = createApp();

beforeEach(() => {
  const product = buildProduct();

  const listResult: ProductListResult = {
    items: [product],
    meta: { page: 1, limit: 24, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
    facets: {
      categories: [],
      brands: [],
      availability: [{ value: 'ready_stock', label: 'Ready stock', count: 1 }],
      specs: [],
    },
  };

  mocked.listProducts.mockResolvedValue(listResult);
  mocked.getProductBySlug.mockResolvedValue({ product, related: [product] });
});

describe('GET /api/v1/products', () => {
  it('returns the product without any internal field', async () => {
    const response = await request(app).get('/api/v1/products').expect(200);

    expect(envelope(response).success).toBe(true);
    expectNoLeak(response.text);
  });

  it('still returns what the storefront needs', async () => {
    const response = await request(app).get('/api/v1/products').expect(200);
    const [item] = envelope<{ items: PublicProduct[] }>(response).data.items;

    // Optional chaining, not a non-null assertion: an empty list should fail
    // these assertions rather than throw before reaching them.
    expect(item?.sku).toBe('TER-S250NJ');
    expect(item?.partNumber).toBe('S250-NJ-250');
    expect(item?.availability).toBe('ready_stock');
    expect(item?.leadTime).toBe('2-3 days');
    expect(item?.isImportItem).toBe(false);
    expect(item?.specifications).toHaveLength(1);
  });

  it('strips price and stock from variants but keeps their identity', async () => {
    const response = await request(app).get('/api/v1/products').expect(200);
    const { items } = envelope<{ items: PublicProduct[] }>(response).data;
    const [variant] = items[0]?.variants ?? [];

    expect(variant).toEqual({ name: '3P 250A', sku: 'TER-S250NJ-3P', attributes: { poles: '3P' } });
  });

  it('rejects a price sort option that no longer exists', async () => {
    await request(app).get('/api/v1/products?sort=price_asc').expect(422);
  });

  it('accepts the availability filter', async () => {
    await request(app).get('/api/v1/products?availability=import_on_request').expect(200);
    await request(app).get('/api/v1/products?availability=cheap').expect(422);
  });
});

describe('GET /api/v1/products/:slug', () => {
  it('returns the detail without any internal field', async () => {
    const response = await request(app)
      .get('/api/v1/products/terasaki-s250-nj-250a')
      .expect(200);

    expect(envelope(response).success).toBe(true);
    expectNoLeak(response.text);
  });

  it('leaks nothing through the `related` list either', async () => {
    const response = await request(app)
      .get('/api/v1/products/terasaki-s250-nj-250a')
      .expect(200);

    const { related } = envelope<{ related: PublicProduct[] }>(response).data;

    expect(related).toHaveLength(1);
    expectNoLeak(related);
  });
});

describe('Product#toPublicJSON', () => {
  it('applies the same whitelist to a hydrated document', () => {
    // No database needed — `new Product()` only builds a document. This covers
    // the schema method, which the controllers do not go through.
    const document = new Product(buildProduct() as unknown as Record<string, unknown>);

    expectNoLeak(document.toPublicJSON());
  });

  it('omits any field that is not on the whitelist', () => {
    const document = new Product(buildProduct() as unknown as Record<string, unknown>);
    const keys = Object.keys(document.toPublicJSON()).sort();

    expect(keys).toEqual(
      [
        '_id',
        'availability',
        'brand',
        'category',
        'createdAt',
        'datasheets',
        'description',
        'images',
        'isBestSeller',
        'isFeatured',
        'isImportItem',
        'isNewArrival',
        'leadTime',
        'minOrderQty',
        'name',
        'partNumber',
        'seo',
        'shortDescription',
        'sku',
        'slug',
        'specifications',
        'subCategory',
        'tags',
        'unit',
        'variants',
        'viewCount',
        'warranty',
      ].sort(),
    );
  });
});
