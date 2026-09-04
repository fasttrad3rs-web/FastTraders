import type { Banner, Brand, Category, Product, Setting, Testimonial } from '@/types';

export type { Testimonial };

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

/** Mirrors `ProductFacets` in server/src/services/catalog.facets.ts. */
export interface ProductFacets {
  categories: FacetBucket[];
  brands: FacetBucket[];
  /** Ready / on order / imported / discontinued — replaced the price slider. */
  availability: FacetBucket[];
  specs: { key: string; values: FacetBucket[] }[];
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
  /*
   * No `price` and no `pricingMode`. The suggest endpoint stopped projecting
   * them at the pivot; leaving them on the type invited a component to render
   * a figure the API no longer sends — and would have rendered one the day
   * anybody put it back.
   */
}

export type { Banner, Setting, Product, Category, Brand };
