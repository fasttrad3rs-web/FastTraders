import { Types } from 'mongoose';

/**
 * Staff-only data, planted so a leak has something to fail on.
 *
 * Two independent detectors run over every public response:
 *
 *  1. **Key names.** No key called `internalCost`, `stock`, `price`… may
 *     appear at any depth.
 *  2. **Sentinel values.** Even if a field is renamed on the way out —
 *     `internalCost` copied to `cost`, say — the *number* still gives it away.
 *
 * The second is the one that catches the interesting bugs. A whitelist that
 * drops `internalCost` but happens to spread `...raw` into `seo` would pass a
 * key check on the field it knew about and still ship the figure.
 *
 * Sentinels are deliberately absurd (`999_111_999`) so they cannot collide
 * with a legitimate count, and so a failure message points straight here.
 */

export const FORBIDDEN_KEYS = [
  'internalCost',
  'lastQuotedPrice',
  'stock',
  'supplierNotes',
  'costPrice',
  'price',
] as const;

/**
 * Values that must never reach a public response.
 *
 * NOTE these are matched against the serialised JSON as substrings, so they
 * must not appear inside any legitimate value. Six-figure numbers with
 * repeating digits are safe; `12` would not be.
 */
export const SENTINELS = [
  '999111999', // internalCost
  '888222888', // lastQuotedPrice
  '777333777', // variant price
  '666444666', // stock count
  'SUPPLIER-NOTE-SENTINEL',
  'COST-PRICE-SENTINEL',
] as const;

/** Every staff-only field, at every nesting depth a leak could hide in. */
export function poisonedProduct(): Record<string, unknown> {
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

    /* ------------------------- staff-only below ------------------------- */
    internalCost: 999_111_999,
    lastQuotedPrice: 888_222_888,
    costPrice: 'COST-PRICE-SENTINEL',
    price: 888_222_888,
    supplierNotes: 'SUPPLIER-NOTE-SENTINEL — Nakamura-san, FOB Osaka, MOQ 5.',
    stock: 666_444_666,
    lowStockThreshold: 3,
    salesCount: 41,

    // A leak one level down. `variants` is spread wholesale by naive code.
    variants: [
      {
        name: '250A 3-pole',
        sku: 'TER-S250NJ-250-3P',
        attributes: { poles: '3', rating: '250A' },
        price: 777_333_777,
        stock: 666_444_666,
        internalCost: 999_111_999,
      },
    ],

    // A leak inside a nested object that is otherwise entirely public.
    seo: {
      metaTitle: 'Terasaki S250-NJ',
      metaDescription: 'MCCB',
      keywords: ['mccb'],
      internalCost: 999_111_999,
    },

    images: [{ url: 'https://res.cloudinary.com/x/a.jpg', alt: 'MCCB', isPrimary: true }],
    specifications: [{ group: 'Electrical', key: 'Rated current', value: '250 A' }],
    datasheets: [],
    tags: ['mccb'],
    availability: 'ready_stock',
    leadTime: '2-3 days',
    isImportItem: false,
    unit: 'piece',
    minOrderQty: 1,
    isFeatured: true,
    isNewArrival: false,
    isBestSeller: true,
    viewCount: 120,
    isActive: true,
    createdAt: new Date('2026-01-15T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
  };
}

/** Collect every key name in a response, at every depth. */
export function allKeys(value: unknown, found: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, found);
    return found;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      found.add(key);
      allKeys(item, found);
    }
  }
  return found;
}
