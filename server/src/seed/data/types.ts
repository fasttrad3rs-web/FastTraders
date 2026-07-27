import type { PricingMode, ProductUnit, Specification } from '../../types';

/**
 * Plain seed-data shapes. Categories and brands are referenced by slug and
 * resolved to ObjectIds by the runner, so the data files stay declarative.
 */

export interface CategorySeed {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  /** Parent slug, or null for a root category. */
  parent: string | null;
  displayOrder: number;
  isFeatured?: boolean;
}

export interface BrandSeed {
  name: string;
  slug: string;
  country: string;
  website?: string;
  description: string;
  isFeatured?: boolean;
  displayOrder: number;
}

export interface ProductSeed {
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  brand: string;
  /** Level-1 category slug. */
  category: string;
  /** Level-2 category slug, when the product sits deeper in the tree. */
  subCategory?: string;
  pricingMode: PricingMode;
  price?: number;
  comparePrice?: number;
  costPrice?: number;
  stock: number;
  unit?: ProductUnit;
  minOrderQty?: number;
  shortDescription: string;
  description: string;
  specifications: Specification[];
  tags: string[];
  warranty?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
}
