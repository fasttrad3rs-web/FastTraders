/**
 * Catalogue types: Category, Brand, Product.
 * MIRRORED FILE — keep in sync with `server/src/types/catalog.types.ts`.
 * NOTE: no price of any kind appears on this shape. Fast Traders publishes
 * no prices; every product routes to an inquiry.
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

/**
 * What a buyer is told instead of a stock count.
 *
 * A number on the shelf is staff data and, for an importer, usually a lie by
 * the time anyone reads it. These four say the thing the buyer is actually
 * asking: can I collect it today, will you order it in, or is it gone.
 */
export type Availability =
  | 'ready_stock'
  | 'available_on_order'
  | 'import_on_request'
  | 'discontinued';

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
  /* No price and no stock — both are admin-only. See the note on `Product`. */
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

  /**
   * CATALOGUE-ONLY: no price, cost, stock count or supplier note appears on
   * this shape. They exist on the server for quoting and are removed by
   * `toPublicJSON()`, so a component cannot render one even by mistake.
   */
  availability: Availability;
  /** Free text, e.g. "2-3 days" or "3-4 weeks (imported)". */
  leadTime?: string;
  isImportItem: boolean;
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

  viewCount: number;

  seo: Seo;
  createdAt: string;
}
