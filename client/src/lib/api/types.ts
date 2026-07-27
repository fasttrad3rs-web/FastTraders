import type { Banner, Brand, Category, Product, Setting } from '@/types';

/** Response shapes returned by the Phase 3 catalogue endpoints. */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FacetBucket {
  value: string;
  label: string;
  count: number;
}

export interface ProductFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  pricingModes: FacetBucket[];
  stockStatus: FacetBucket[];
  specs: { key: string; values: FacetBucket[] }[];
  priceRange: { min: number; max: number } | null;
}

export interface ProductListResponse {
  items: Product[];
  meta: PaginationMeta;
  facets: ProductFacets;
}

export interface ProductDetailResponse {
  product: Product;
  related: Product[];
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  level: number;
  displayOrder: number;
  isFeatured: boolean;
  productCount: number;
  children: CategoryNode[];
}

export interface CategoryDetailResponse {
  category: Category;
  breadcrumbs: { name: string; slug: string }[];
  children: (Category & { productCount: number })[];
  productCount: number;
}

export interface BrandWithCount extends Brand {
  productCount?: number;
}

export interface Suggestion {
  id: string;
  name: string;
  slug: string;
  sku: string;
  partNumber?: string;
  image?: string;
  price?: number;
  pricingMode: string;
}

export type { Banner, Setting, Product, Category, Brand };
