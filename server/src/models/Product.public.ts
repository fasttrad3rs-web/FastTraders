import type { Availability, Datasheet, ProductImage, Seo, Specification } from '../types';

/**
 * The public product shape, and the only function allowed to build one.
 *
 * WHITELIST, not blacklist. `.select('-internalCost')` and friends fail the
 * moment someone adds a field — the new one ships publicly by default and
 * nobody notices until it is in Google's cache. A whitelist fails the other
 * way: forget to add a field and it is merely missing, which somebody will
 * report within the hour.
 *
 * It lives outside the schema file so `.lean()` queries — which have no
 * document methods — go through exactly the same code path as hydrated ones.
 */

/** A variant with its internal price and stock count removed. */
export interface PublicVariant {
  name: string;
  sku: string;
  attributes: Record<string, string>;
  image?: string;
}

export interface PublicProduct {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  description: string;
  shortDescription?: string;
  category: unknown;
  subCategory: unknown;
  brand: unknown;
  images: ProductImage[];
  specifications: Specification[];
  variants: PublicVariant[];
  datasheets: Datasheet[];
  tags: string[];
  warranty?: string;
  availability: Availability;
  leadTime?: string;
  isImportItem: boolean;
  /** "12" means nothing without knowing whether it is pieces or metres. */
  unit: string;
  minOrderQty: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  viewCount: number;
  seo: Seo;
  createdAt: string;
}

/**
 * Input is deliberately loose. Callers pass hydrated documents, `.lean()`
 * rows and populated shapes, and a narrower parameter type would only invite
 * a cast at every call site — which is the thing that eventually casts away
 * a field that should have been dropped.
 */
export type SerialisableProduct = object;

type Raw = Record<string, unknown>;

const asRaw = (input: SerialisableProduct): Raw => input as Raw;

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' ? value : 0);
const bool = (value: unknown): boolean => value === true;
const arr = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/**
 * `_id` may arrive as an ObjectId, a string, or already transformed to `id`.
 * ObjectId's own `toString` gives the hex; anything else would stringify to
 * "[object Object]", so it is rejected rather than serialised as junk.
 */
function idOf(raw: Raw): string {
  const candidate = raw._id ?? raw.id;
  if (typeof candidate === 'string') return candidate;
  if (isObjectId(candidate)) return candidate.toHexString();
  return '';
}

interface ObjectIdLike {
  _bsontype: string;
  toHexString(): string;
}

function isObjectId(value: unknown): value is ObjectIdLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_bsontype' in value &&
    typeof (value as { toHexString?: unknown }).toHexString === 'function'
  );
}

/** Dates go out as ISO strings whether they arrived hydrated or lean. */
function isoOf(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : '';
}

/**
 * A populated ref, reduced to the four fields a storefront actually renders.
 * An unpopulated ObjectId becomes a string.
 *
 * This used to `return value` for any object, which quietly made the whitelist
 * shallow: a populated category or brand shipped whatever the populate
 * selected, and a `.populate('brand')` without a `.select()` ships the whole
 * document. Naming the fields means a new column on Brand cannot ride along.
 */
function refOf(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (isObjectId(value)) return value.toHexString();
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return null;

  const raw = value as Raw;
  return {
    _id: idOf(raw),
    name: str(raw.name),
    slug: str(raw.slug),
    ...(str(raw.logo) ? { logo: str(raw.logo) } : {}),
  };
}

/* --------------------------------------------------------------------------
 * Nested values are rebuilt field by field, never passed through.
 *
 * The leak sweep caught this: `seo` was assigned straight from the document,
 * so anything sitting inside it shipped — the guard found a planted
 * `internalCost` in a response that had otherwise been correctly whitelisted.
 * The subschemas are strict, so this was not yet exploitable in production,
 * but "not yet" is the whole problem. A whitelist that stops at the top level
 * is a whitelist of one level and a blacklist of everything below it.
 * ----------------------------------------------------------------------- */

function publicImage(raw: Raw): ProductImage {
  return {
    url: str(raw.url),
    publicId: str(raw.publicId),
    alt: str(raw.alt),
    isPrimary: bool(raw.isPrimary),
  };
}

function publicSpecification(raw: Raw): Specification {
  return {
    key: str(raw.key),
    value: str(raw.value),
    ...(str(raw.group) ? { group: str(raw.group) } : {}),
  };
}

function publicDatasheet(raw: Raw): Datasheet {
  return { title: str(raw.title), url: str(raw.url), publicId: str(raw.publicId) };
}

function publicSeo(value: unknown): Seo {
  if (value === null || typeof value !== 'object') return { keywords: [] };
  const raw = value as Raw;
  return {
    ...(str(raw.title) ? { title: str(raw.title) } : {}),
    ...(str(raw.description) ? { description: str(raw.description) } : {}),
    keywords: arr<unknown>(raw.keywords).filter((k): k is string => typeof k === 'string'),
  };
}

/** Variants keep their identity and attributes; price and stock are dropped. */
function publicVariant(raw: Raw): PublicVariant {
  const attributes = raw.attributes;
  return {
    name: str(raw.name),
    sku: str(raw.sku),
    attributes:
      attributes instanceof Map
        ? Object.fromEntries(attributes as Map<string, string>)
        : ((attributes as Record<string, string> | undefined) ?? {}),
    ...(str(raw.image) ? { image: str(raw.image) } : {}),
  };
}

export function toPublicProduct(input: SerialisableProduct): PublicProduct {
  const raw = asRaw(input);

  return {
    _id: idOf(raw),
    name: str(raw.name),
    slug: str(raw.slug),
    sku: str(raw.sku),
    ...(str(raw.partNumber) ? { partNumber: str(raw.partNumber) } : {}),
    description: str(raw.description),
    ...(str(raw.shortDescription) ? { shortDescription: str(raw.shortDescription) } : {}),
    category: refOf(raw.category),
    subCategory: refOf(raw.subCategory),
    brand: refOf(raw.brand),
    images: arr<Raw>(raw.images).map(publicImage),
    specifications: arr<Raw>(raw.specifications).map(publicSpecification),
    variants: arr<Raw>(raw.variants).map(publicVariant),
    datasheets: arr<Raw>(raw.datasheets).map(publicDatasheet),
    tags: arr<unknown>(raw.tags).filter((t): t is string => typeof t === 'string'),
    ...(str(raw.warranty) ? { warranty: str(raw.warranty) } : {}),
    availability: (str(raw.availability) || 'available_on_order') as Availability,
    ...(str(raw.leadTime) ? { leadTime: str(raw.leadTime) } : {}),
    isImportItem: bool(raw.isImportItem),
    unit: str(raw.unit) || 'piece',
    minOrderQty: num(raw.minOrderQty) || 1,
    isFeatured: bool(raw.isFeatured),
    isNewArrival: bool(raw.isNewArrival),
    isBestSeller: bool(raw.isBestSeller),
    viewCount: num(raw.viewCount),
    seo: publicSeo(raw.seo),
    createdAt: isoOf(raw.createdAt),
  };
}

/** Convenience for list endpoints. */
export function toPublicProducts(rows: SerialisableProduct[]): PublicProduct[] {
  return rows.map((row) => toPublicProduct(row));
}
