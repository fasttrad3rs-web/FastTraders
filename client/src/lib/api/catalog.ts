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
  Testimonial,
} from './types';

/**
 * Catalogue read functions for Server Components.
 * Each maps 1:1 to a Phase 3 endpoint.
 */

/**
 * Mirrors `productQuerySchema` in server/src/validators/catalog.validators.ts.
 * Anything not listed there is stripped by Zod, and an unknown `sort` is a 422
 * — so these two must be kept in step.
 */
export interface ProductQueryParams {
  page?: number;
  limit?: number;
  /** No price sorts: ordering by a hidden field would leak it. */
  sort?: 'newest' | 'name_asc' | 'name_desc' | 'popular';
  category?: string;
  brand?: string;
  availability?: 'ready_stock' | 'available_on_order' | 'import_on_request' | 'discontinued';
  isFeatured?: boolean;
  /** Import-items-only toggle. Only ever sent as `true`. */
  isImportItem?: boolean;
  tags?: string;
  search?: string;
  specs?: string;
}

/*
 * Every product list carries the `products` tag so an admin write can flush it.
 *
 * Without it the homepage rails were cached for the full `revalidate` window
 * with no way to invalidate them, so a product deactivated in the admin stayed
 * on the storefront for up to five minutes. Callers can still add their own
 * tags; this one is always present.
 */
export function getProducts(
  params: ProductQueryParams = {},
  options?: FetchOptions,
): Promise<ProductListResponse | null> {
  return serverFetch<ProductListResponse>(`/products${toQuery({ ...params })}`, {
    ...options,
    tags: ['products', ...(options?.tags ?? [])],
  });
}

export function getProduct(slug: string): Promise<ProductDetailResponse | null> {
  return serverFetch<ProductDetailResponse>(`/products/${slug}`, {
    // `products` too: deactivating an item must drop its detail page as well.
    tags: ['products', `product:${slug}`],
  });
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

/**
 * Published testimonials. Pass a product id to get only the quotes attached to
 * that product; omit it for the homepage strip.
 */
export function getTestimonials(product?: string, limit = 12): Promise<Testimonial[] | null> {
  return serverFetch<Testimonial[]>(`/testimonials${toQuery({ product, limit })}`, {
    tags: ['testimonials'],
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
