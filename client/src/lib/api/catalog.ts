import { serverFetch, toQuery, type FetchOptions } from './endpoints';
import type {
  Banner,
  BrandWithCount,
  CategoryDetailResponse,
  CategoryNode,
  ProductDetailResponse,
  ProductListResponse,
  Setting,
  Product,
} from './types';

/**
 * Catalogue read functions for Server Components.
 * Each maps 1:1 to a Phase 3 endpoint.
 */

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name';
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  pricingMode?: 'retail' | 'quote' | 'both';
  isFeatured?: boolean;
  tags?: string;
  search?: string;
  specs?: string;
}

export function getProducts(
  params: ProductQueryParams = {},
  options?: FetchOptions,
): Promise<ProductListResponse | null> {
  return serverFetch<ProductListResponse>(`/products${toQuery({ ...params })}`, options);
}

export function getProduct(slug: string): Promise<ProductDetailResponse | null> {
  return serverFetch<ProductDetailResponse>(`/products/${slug}`, { tags: [`product:${slug}`] });
}

export function getSimilarProducts(id: string, limit = 8): Promise<Product[] | null> {
  return serverFetch<Product[]>(`/products/${id}/similar${toQuery({ limit })}`);
}

export function getCategoryTree(featuredOnly = false): Promise<CategoryNode[] | null> {
  return serverFetch<CategoryNode[]>(`/categories${toQuery({ featuredOnly })}`, {
    tags: ['categories'],
  });
}

export function getCategory(slug: string): Promise<CategoryDetailResponse | null> {
  return serverFetch<CategoryDetailResponse>(`/categories/${slug}`, { tags: [`category:${slug}`] });
}

export function getBrands(withCounts = false): Promise<BrandWithCount[] | null> {
  return serverFetch<BrandWithCount[]>(`/brands${toQuery({ withCounts })}`, { tags: ['brands'] });
}

export function getBanners(position?: 'hero' | 'strip' | 'sidebar'): Promise<Banner[] | null> {
  return serverFetch<Banner[]>(`/banners${toQuery({ position })}`, {
    // Promotions change more often than the catalogue.
    revalidate: 60,
    tags: ['banners'],
  });
}

export function getSettings(): Promise<Setting | null> {
  return serverFetch<Setting>('/settings', { revalidate: 600, tags: ['settings'] });
}

/** Convenience wrappers used by the home page. */
export const getFeaturedProducts = (limit = 8): Promise<ProductListResponse | null> =>
  getProducts({ isFeatured: true, limit, sort: 'popular' });

export const getNewArrivals = (limit = 8): Promise<ProductListResponse | null> =>
  getProducts({ limit, sort: 'newest' });

export const getBestSellers = (limit = 8): Promise<ProductListResponse | null> =>
  getProducts({ limit, sort: 'popular' });
