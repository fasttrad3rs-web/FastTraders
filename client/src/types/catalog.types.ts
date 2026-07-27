/**
 * Catalogue types: Category, Brand, Product.
 * MIRRORED FILE — keep in sync with `server/src/types/catalog.types.ts`.
 * NOTE: `costPrice` is deliberately absent — it is server-only and is never
 * returned by the public API.
 */

/** Search-engine metadata attached to catalogue entities. */
export interface Seo {
  title?: string;
  description?: string;
  keywords: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  /** Lucide icon name rendered in navigation. */
  icon?: string;
  /** Immediate parent, or null for a root category. */
  parent: string | null;
  /** Materialised path from root to parent — powers breadcrumbs and subtree queries. */
  ancestors: string[];
  /** 0 = root, 1 = child, 2 = grandchild. Max depth is 2. */
  level: number;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  seo: Seo;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  country?: string;
  website?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Hybrid commerce switch — drives which cart a product can enter. */
export type PricingMode = 'retail' | 'quote' | 'both';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';

export type ProductUnit = 'piece' | 'meter' | 'roll' | 'box' | 'set';

export interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
  isPrimary: boolean;
}

/** A single technical attribute, e.g. { group: 'Electrical', key: 'Rated Current', value: '100 A' }. */
export interface Specification {
  key: string;
  value: string;
  /** Optional grouping header for the spec table, e.g. "Electrical" / "Mechanical". */
  group?: string;
}

export interface ProductVariant {
  name: string;
  sku: string;
  /** Free-form attribute map, e.g. { poles: '3P', rating: '100A' }. */
  attributes: Record<string, string>;
  price?: number;
  stock: number;
  image?: string;
}

export interface Datasheet {
  title: string;
  url: string;
  publicId: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  /** Rich-text HTML. */
  description: string;
  shortDescription?: string;
  category: string | Category;
  subCategory?: string | Category | null;
  brand: string | Brand;

  pricingMode: PricingMode;
  /** Absent on `quote`-only products. */
  price?: number;
  /** Struck-through "was" price. */
  comparePrice?: number;
  taxRate: number;
  currency: 'PKR';

  stock: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  unit: ProductUnit;
  minOrderQty: number;

  images: ProductImage[];
  specifications: Specification[];
  variants: ProductVariant[];
  datasheets: Datasheet[];

  tags: string[];
  warranty?: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isActive: boolean;

  ratingAvg: number;
  reviewCount: number;
  viewCount: number;
  salesCount: number;

  seo: Seo;
  createdAt: string;
  updatedAt: string;
}
