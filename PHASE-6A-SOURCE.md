# Fast Traders — Phase 6A source dump
Data layer, SEO infrastructure, home, catalogue, product, category and brand pages.
Total files: 33

---

## `client/src/lib/api/endpoints.ts`

```ts
/**
 * Server-side data fetching for React Server Components.
 *
 * Uses `fetch` directly (not the browser api-client) so Next.js can apply its
 * data cache: product and category pages are ISR'd with `revalidate: 300`,
 * which keeps a 3G first paint fast without serving day-old stock levels.
 */
import { env } from '@/lib/env';
import type { ApiResponse } from '@/types/api';

/** Product and category pages regenerate every 5 minutes. */
export const CATALOGUE_REVALIDATE = 300;

export interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
  /** Never cache — used for anything user-specific. */
  noStore?: boolean;
}

/**
 * Fetch an API envelope on the server.
 * Returns `null` rather than throwing on a failed request: a dead brand strip
 * should degrade the page, not blank it. Callers that genuinely need the data
 * (a product detail page) check for null and call `notFound()`.
 */
export async function serverFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T | null> {
  const url = `${env.NEXT_PUBLIC_API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(options.noStore
        ? { cache: 'no-store' as const }
        : {
            next: {
              revalidate: options.revalidate ?? CATALOGUE_REVALIDATE,
              ...(options.tags ? { tags: options.tags } : {}),
            },
          }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<T>;
    return body.success ? body.data : null;
  } catch {
    // Network failure or the API being down — render the page without this slice.
    return null;
  }
}

/** Build a query string, dropping empty values. */
export function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}
```

## `client/src/lib/api/types.ts`

```ts
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
```

## `client/src/lib/api/catalog.ts`

```ts
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
```

## `client/src/lib/api/queries.ts`

```ts
'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient, unwrap } from '@/lib/api-client';
import type { ProductListResponse, Suggestion } from './types';
import type { ProductQueryParams } from './catalog';

/**
 * Client-side queries.
 *
 * Only the interactive surfaces need these — the filter sidebar re-queries on
 * every change, and search autocomplete runs per keystroke. Everything else is
 * fetched on the server.
 */

/** Query-key factory: one place to look when invalidating. */
export const catalogKeys = {
  all: ['catalog'] as const,
  products: (params: ProductQueryParams) => [...catalogKeys.all, 'products', params] as const,
  suggest: (term: string) => [...catalogKeys.all, 'suggest', term] as const,
};

export function useProducts(params: ProductQueryParams): UseQueryResult<ProductListResponse> {
  return useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: async () => {
      const response = await apiClient.get<ProductListResponse>('/products', {
        params: { ...params },
      });
      return unwrap(response);
    },
    // Keeps the previous grid on screen while the next page loads, so the
    // layout does not collapse on a slow connection.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useSuggestions(term: string): UseQueryResult<Suggestion[]> {
  return useQuery({
    queryKey: catalogKeys.suggest(term),
    queryFn: async () => {
      const response = await apiClient.get<Suggestion[]>('/search/suggest', {
        params: { q: term, limit: 8 },
      });
      return unwrap(response);
    },
    enabled: term.trim().length >= 2,
    staleTime: 5 * 60_000,
  });
}
```

## `client/src/lib/seo/business.ts`

```ts
import { CONTACT, SITE } from '@/lib/constants';

/**
 * Structured data for the business itself.
 *
 * The address, both phone numbers and the opening hours are the client's real
 * details — this is what feeds the Google Business panel for searches like
 * "circuit breakers Lahore", so it has to match the shopfront exactly.
 */

/** Grace Tower, Bull Road, Lahore. Refine with an exact GPS pin before launch. */
export const GEO = { latitude: 31.5497, longitude: 74.3436 } as const;

export const TARGET_KEYWORDS = [
  'circuit breakers Lahore',
  'electrical components Pakistan',
  'Schneider Electric dealer Lahore',
  'industrial automation parts Lahore',
  'MCCB price in Pakistan',
  'cable supplier Lahore',
] as const;

export function organizationSchema(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/brand/logo.svg`,
    description: SITE.shortDescription,
    founder: { '@type': 'Person', name: 'Sharjeel Bin Ejaz' },
    email: CONTACT.email,
    telephone: CONTACT.mobile,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${CONTACT.address.line1}, ${CONTACT.address.line2}`,
      addressLocality: CONTACT.address.city,
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: CONTACT.mobile,
        contactType: 'sales',
        areaServed: 'PK',
        availableLanguage: ['English', 'Urdu'],
      },
      {
        '@type': 'ContactPoint',
        telephone: CONTACT.landline,
        contactType: 'customer service',
        areaServed: 'PK',
      },
    ],
  };
}

export function localBusinessSchema(): Record<string, unknown> {
  return {
    '@type': ['Store', 'ElectricalContractor'],
    '@id': `${SITE.url}/#localbusiness`,
    name: SITE.name,
    image: `${SITE.url}/brand/logo.svg`,
    url: SITE.url,
    telephone: CONTACT.landline,
    email: CONTACT.email,
    priceRange: 'Rs.',
    currenciesAccepted: 'PKR',
    paymentAccepted: 'Cash, Bank Transfer, Credit Card, JazzCash, Easypaisa',
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${CONTACT.address.line1}, ${CONTACT.address.line2}`,
      addressLocality: CONTACT.address.city,
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
    geo: { '@type': 'GeoCoordinates', ...GEO },
    // Mon–Sat 10:00–19:00; closed Sunday.
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '19:00',
      },
    ],
    areaServed: [
      { '@type': 'City', name: 'Lahore' },
      { '@type': 'Country', name: 'Pakistan' },
    ],
    parentOrganization: { '@id': `${SITE.url}/#organization` },
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    publisher: { '@id': `${SITE.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/products?search={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}
```

## `client/src/lib/seo/schema.ts`

```ts
import { SITE } from '@/lib/constants';
import type { Product } from '@/types';

/** Page-level structured data builders. */

export interface BreadcrumbEntry {
  name: string;
  /** Path relative to the site root, e.g. `/products`. */
  path: string;
}

export function breadcrumbSchema(entries: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...entries].map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: `${SITE.url}${entry.path}`,
    })),
  };
}

const AVAILABILITY: Record<string, string> = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  out_of_stock: 'https://schema.org/OutOfStock',
  on_order: 'https://schema.org/BackOrder',
};

/**
 * Product schema.
 *
 * Quote-only products get no `offers.price` — publishing a price we do not
 * actually quote would be both wrong and a Merchant Center violation. They
 * still carry the brand, SKU and MPN, which is what part-number searches hit.
 */
export function productSchema(product: Product, canonicalPath: string): Record<string, unknown> {
  const brandName = typeof product.brand === 'string' ? undefined : product.brand.name;
  const image = product.images.map((item) =>
    item.url.startsWith('http') ? item.url : `${SITE.url}${item.url}`,
  );

  const base: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${SITE.url}${canonicalPath}#product`,
    name: product.name,
    description: product.shortDescription ?? product.name,
    sku: product.sku,
    ...(product.partNumber ? { mpn: product.partNumber } : {}),
    ...(brandName ? { brand: { '@type': 'Brand', name: brandName } } : {}),
    ...(image.length > 0 ? { image } : {}),
    url: `${SITE.url}${canonicalPath}`,
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    ...(product.specifications.length > 0
      ? {
          additionalProperty: product.specifications.map((spec) => ({
            '@type': 'PropertyValue',
            name: spec.key,
            value: spec.value,
          })),
        }
      : {}),
  };

  if (product.pricingMode === 'quote' || typeof product.price !== 'number') {
    return base;
  }

  return {
    ...base,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'PKR',
      availability: AVAILABILITY[product.stockStatus] ?? AVAILABILITY.in_stock,
      url: `${SITE.url}${canonicalPath}`,
      seller: { '@id': `${SITE.url}/#organization` },
      // Quoted prices are held for 30 days; the offer mirrors that.
      priceValidUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    },
  };
}

export function itemListSchema(
  products: Product[],
  pathFor: (product: Product) => string,
): Record<string, unknown> {
  return {
    '@type': 'ItemList',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE.url}${pathFor(product)}`,
      name: product.name,
    })),
  };
}

export function faqSchema(entries: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
```

## `client/src/lib/seo/index.ts`

```ts
import type { Metadata } from 'next';
import { SITE } from '@/lib/constants';

export * from './business';
export * from './schema';

/**
 * Build page metadata with the canonical URL, Open Graph and Twitter card
 * filled in consistently. Every dynamic route calls this from
 * `generateMetadata`.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  keywords,
  noIndex,
}: {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. `/products/mccb-250a`. */
  path: string;
  image?: string;
  keywords?: readonly string[];
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE.url}${path}`;
  const ogImage = image?.startsWith('http') ? image : image ? `${SITE.url}${image}` : undefined;

  return {
    title,
    description,
    ...(keywords ? { keywords: [...keywords] } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
```

## `client/src/components/shared/json-ld.tsx`

```tsx
/**
 * Renders one JSON-LD graph per page.
 *
 * Google prefers a single `@graph` over several loose script tags, and it lets
 * nodes cross-reference by `@id` (Product → seller → Organization).
 */
export function JsonLd({ schemas }: { schemas: Record<string, unknown>[] }): JSX.Element {
  const graph = { '@context': 'https://schema.org', '@graph': schemas };

  return (
    <script
      type="application/ld+json"
      // Structured data is generated by us, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  );
}
```

## `client/src/app/sitemap.ts`

```ts
import type { MetadataRoute } from 'next';
import { getBrands, getCategoryTree, getProducts } from '@/lib/api/catalog';
import { SITE } from '@/lib/constants';
import type { CategoryNode } from '@/lib/api/types';

/**
 * Dynamic sitemap.
 *
 * Regenerated hourly. Product URLs are pulled in pages of 100 with a hard cap,
 * so a catalogue that grows to thousands of SKUs cannot time the route out.
 */
export const revalidate = 3600;

const MAX_PRODUCTS = 5000;
const PAGE_SIZE = 100;

const STATIC_ROUTES: { path: string; priority: number; frequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, frequency: 'daily' },
  { path: '/products', priority: 0.9, frequency: 'daily' },
  { path: '/brands', priority: 0.7, frequency: 'weekly' },
  { path: '/industries', priority: 0.6, frequency: 'monthly' },
  { path: '/about', priority: 0.6, frequency: 'monthly' },
  { path: '/contact', priority: 0.7, frequency: 'monthly' },
  { path: '/request-quote', priority: 0.8, frequency: 'monthly' },
  { path: '/faq', priority: 0.5, frequency: 'monthly' },
  { path: '/shipping-returns', priority: 0.4, frequency: 'yearly' },
  { path: '/privacy-policy', priority: 0.3, frequency: 'yearly' },
  { path: '/terms', priority: 0.3, frequency: 'yearly' },
];

/** Depth-first walk so nested categories are all included. */
function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children)]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE.url}${route.path}`,
    lastModified: now,
    changeFrequency: route.frequency,
    priority: route.priority,
  }));

  const [tree, brands] = await Promise.all([getCategoryTree(), getBrands()]);

  for (const category of flattenCategories(tree ?? [])) {
    entries.push({
      url: `${SITE.url}/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: category.level === 0 ? 0.8 : 0.6,
    });
  }

  for (const brand of brands ?? []) {
    entries.push({
      url: `${SITE.url}/brands/${brand.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  let page = 1;
  while (entries.length < MAX_PRODUCTS) {
    const result = await getProducts({ page, limit: PAGE_SIZE, sort: 'newest' }, { revalidate: 3600 });
    if (!result || result.items.length === 0) break;

    for (const product of result.items) {
      entries.push({
        url: `${SITE.url}/products/${product.slug}`,
        lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
        changeFrequency: 'weekly',
        priority: product.isFeatured ? 0.8 : 0.7,
      });
    }

    if (!result.meta.hasNext) break;
    page += 1;
  }

  return entries;
}
```

## `client/src/app/robots.ts`

```ts
import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';

/** Dynamic robots.txt. Account, cart and checkout are never indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/cart',
          '/inquiry',
          '/checkout',
          '/order-confirmation',
          '/style-guide',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
```

## `client/scripts/generate-placeholders.mjs`

```js
/**
 * Generate branded product placeholders.
 *
 * One SVG per top-level category, in Fast Traders navy/cyan. Products render
 * their SKU as an HTML overlay on top, so we need eight files rather than one
 * per SKU — and nothing is fetched from a third-party placeholder service.
 *
 *   node scripts/generate-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const NAVY = '#1B2A6B';
const DARK = '#0F1B4C';
const CYAN = '#00AEEF';
const SURFACE = '#F7F9FC';

/** Simple line glyphs, drawn on a 24×24 grid and scaled up. */
const GLYPHS = {
  breaker: '<rect x="7" y="3" width="10" height="18" rx="1.5"/><path d="M12 7v4M9.5 12.5h5M12 13.5v3.5"/>',
  automation: '<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 10h3M8 13h5M15 10h1.5M15 13h1.5"/>',
  component: '<circle cx="12" cy="12" r="7"/><path d="M12 5v3M12 16v3M5 12h3M16 12h3"/>',
  cable: '<path d="M4 8c4 0 4 8 8 8s4-8 8-8"/><rect x="2" y="6" width="3" height="4" rx="1"/><rect x="19" y="14" width="3" height="4" rx="1"/>',
  power: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  safety: '<path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z"/><path d="M9.5 12l2 2 3.5-4"/>',
  tools: '<path d="M14.5 4.5a4 4 0 0 0-5.3 5.3L4 15v5h5l5.2-5.2a4 4 0 0 0 5.3-5.3l-3 3-2.3-2.3z"/>',
  default: '<rect x="4" y="7" width="16" height="10" rx="1.5"/><path d="M8 11h8"/>',
};

/** Category slug → glyph. Anything unmapped falls back to `default`. */
const CATEGORIES = {
  'switchgear-protection': 'breaker',
  'circuit-breakers': 'breaker',
  'control-automation': 'automation',
  'control-components': 'component',
  'cables-wiring': 'cable',
  'power-motors': 'power',
  'safety-products': 'safety',
  'tools-accessories': 'tools',
  default: 'default',
};

function svg(glyphKey) {
  const glyph = GLYPHS[glyphKey] ?? GLYPHS.default;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600" role="img" aria-label="Product image pending">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${DARK}"/>
      <stop offset="1" stop-color="${NAVY}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0v40" fill="none" stroke="${NAVY}" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="600" height="600" fill="${SURFACE}"/>
  <rect width="600" height="600" fill="url(#grid)"/>

  <g transform="translate(180 150) scale(10)" fill="none" stroke="url(#g)" stroke-width="1.4"
     stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
    ${glyph}
  </g>

  <rect x="0" y="540" width="600" height="60" fill="${NAVY}"/>
  <rect x="0" y="536" width="600" height="4" fill="${CYAN}"/>
  <text x="300" y="578" text-anchor="middle" font-family="Inter, Arial, sans-serif"
        font-size="19" font-weight="700" letter-spacing="3" fill="#FFFFFF">FAST TRADERS</text>
</svg>`;
}

const outDir = path.resolve(process.cwd(), 'public/placeholders');
mkdirSync(outDir, { recursive: true });

for (const [slug, glyph] of Object.entries(CATEGORIES)) {
  writeFileSync(path.join(outDir, `${slug}.svg`), svg(glyph), 'utf8');
}

console.log(`Wrote ${Object.keys(CATEGORIES).length} placeholders to public/placeholders/`);
```

## `client/src/components/home/contact-strip.tsx`

```tsx
import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONTACT } from '@/lib/constants';
import { whatsappLink } from '@/lib/utils';

/** Google Maps embed for Grace Tower, Bull Road, Lahore. */
export const MAP_EMBED_SRC =
  'https://www.google.com/maps?q=Grace+Tower,+Bull+Road,+Lahore,+Pakistan&output=embed';

/** Closing CTA: map on one side, the full contact card on the other. */
export function ContactStrip(): JSX.Element {
  return (
    <section className="bg-brand-dark text-white">
      <div className="container grid gap-8 py-14 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">Visit or call</p>
          <h2 className="mt-3 font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Come to the counter, or send us the part number
          </h2>
          <p className="mt-3 max-w-xl text-white/65">
            We are on Bull Road in Lahore, six days a week. If you know the part number, WhatsApp it
            and we will confirm stock and price straight away.
          </p>

          <ul className="mt-7 space-y-3.5 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <span className="text-white/80">{CONTACT.address.full}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <span className="text-white/80">
                <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`} className="hover:text-brand-cyan">
                  {CONTACT.mobile}
                </a>
                <span className="mx-2 text-white/25">·</span>
                <a href={`tel:${CONTACT.landline.replace(/\s/g, '')}`} className="hover:text-brand-cyan">
                  {CONTACT.landline}
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <a href={`mailto:${CONTACT.email}`} className="text-white/80 hover:text-brand-cyan">
                {CONTACT.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-cyan" aria-hidden />
              <span className="text-white/80">
                Monday – Saturday, 10:00 – 19:00 · Closed Sunday
              </span>
            </li>
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="cta" size="lg">
              <a
                href={whatsappLink(
                  CONTACT.whatsappDigits,
                  'Hello Fast Traders, I would like to check stock and pricing.',
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle />
                WhatsApp us
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/contact">Contact page</Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <iframe
            src={MAP_EMBED_SRC}
            title="Fast Traders on Google Maps — Grace Tower, Bull Road, Lahore"
            width="100%"
            height="380"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block border-0"
          />
        </div>
      </div>
    </section>
  );
}
```

## `client/src/components/home/discovery.tsx`

```tsx
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/separator';
import type { BrandWithCount, CategoryNode } from '@/lib/api/types';

/** "Shop by category" grid and the authorised-brand grid. */

/**
 * Resolve a Lucide icon by the name stored on the category.
 * Falls back to a neutral glyph so a typo in the admin never breaks the grid.
 */
function CategoryIcon({ name }: { name?: string }): JSX.Element {
  const Fallback = Icons.Boxes;
  const Icon = (name && (Icons as unknown as Record<string, unknown>)[name]) as
    | React.ComponentType<{ className?: string }>
    | undefined;

  const Resolved = Icon ?? Fallback;
  return <Resolved className="size-7" />;
}

export function CategoryGrid({ categories }: { categories: CategoryNode[] }): JSX.Element | null {
  if (categories.length === 0) return null;

  return (
    <section className="container py-14">
      <SectionHeading
        title="Shop by Category"
        description="Everything from a single MCB to a full LT panel build."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/products">
              All products
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {categories.slice(0, 7).map((category) => (
          <li key={category.id}>
            <Link
              href={`/categories/${category.slug}`}
              className="group flex h-full flex-col items-center gap-3 rounded-lg border border-border bg-white p-5 text-center transition-all hover:border-brand-cyan hover:shadow-card-hover"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-brand-navy/5 text-brand-navy transition-colors group-hover:bg-brand-cyan group-hover:text-white">
                <CategoryIcon name={category.icon} />
              </span>
              <span className="text-sm font-semibold leading-snug text-brand-navy">{category.name}</span>
              {category.productCount > 0 ? (
                <span className="text-2xs text-muted-foreground">{category.productCount} products</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BrandGrid({ brands }: { brands: BrandWithCount[] }): JSX.Element | null {
  if (brands.length === 0) return null;

  return (
    <section className="border-y border-border bg-white py-14">
      <div className="container">
        <SectionHeading
          title="Brands We Deal In"
          description="Authorised stockist and supplier. Click a brand to see everything we hold."
        />

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {brands.map((brand) => (
            <li key={brand.id}>
              <Link
                href={`/brands/${brand.slug}`}
                className="group flex h-24 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface px-3 text-center transition-all hover:border-brand-cyan hover:bg-white hover:shadow-card"
              >
                <span className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy/55 transition-colors group-hover:text-brand-navy">
                  {brand.name}
                </span>
                {brand.country ? (
                  <span className="text-2xs text-muted-foreground">{brand.country}</span>
                ) : null}
                {typeof brand.productCount === 'number' && brand.productCount > 0 ? (
                  <span className="text-2xs font-medium text-brand-cyan opacity-0 transition-opacity group-hover:opacity-100">
                    {brand.productCount} products
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

## `client/src/components/home/hero.tsx`

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Banner } from '@/types';

/**
 * Hero slider driven by the `hero` banners from Settings.
 *
 * Auto-advances every 7 seconds, pauses on hover or focus, and stops entirely
 * for `prefers-reduced-motion`. The first slide's image is `priority` — it is
 * the LCP element on the homepage.
 */
export function HeroSlider({ banners }: { banners: Banner[] }): JSX.Element | null {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = banners.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => setIndex((current) => (current + 1) % count), 7000);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      className="bg-brand-gradient relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {banners.map((banner, position) => (
        <div
          key={banner.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${position + 1} of ${count}`}
          aria-hidden={position !== index}
          className={cn(
            'transition-opacity duration-500',
            position === index ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0',
          )}
        >
          <div className="container grid items-center gap-8 py-14 lg:grid-cols-2 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">
                Lahore, Pakistan
              </p>
              <h1 className="text-balance mt-4 font-heading text-3xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {banner.title}
              </h1>
              {banner.subtitle ? (
                <p className="mt-4 max-w-xl text-base text-white/70">{banner.subtitle}</p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="cta" size="lg">
                  <Link href={banner.link ?? '/products'}>
                    {banner.ctaText ?? 'Browse Catalog'}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/request-quote">
                    <FileText />
                    Request a Quote
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative hidden aspect-[16/10] overflow-hidden rounded-lg border border-white/10 lg:block">
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                sizes="(max-width: 1024px) 0px, 50vw"
                priority={position === 0}
                className="object-cover"
              />
            </div>
          </div>
        </div>
      ))}

      {count > 1 ? (
        <div className="container flex items-center gap-3 pb-6">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="ml-2 flex gap-1.5">
            {banners.map((banner, position) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(position)}
                aria-label={`Go to slide ${position + 1}`}
                aria-current={position === index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  position === index ? 'w-7 bg-brand-cyan' : 'w-3 bg-white/30 hover:bg-white/50',
                )}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

## `client/src/components/home/marketing.tsx`

```tsx
import Link from 'next/link';
import {
  Building2,
  Cpu,
  FileText,
  Factory,
  HardHat,
  Quote,
  Shirt,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/separator';
import { CONTACT } from '@/lib/constants';

/** RFQ banner, industries, why-choose-us and testimonials. */

export function RfqBanner(): JSX.Element {
  return (
    <section className="container py-14">
      <div className="bg-brand-gradient flex flex-col items-start gap-6 rounded-lg p-8 text-white lg:flex-row lg:items-center lg:justify-between lg:p-12">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-cyan">Bulk orders</p>
          <h2 className="mt-3 font-heading text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Need a quote for a large order?
          </h2>
          <p className="mt-3 text-white/70">
            We serve contractors, panel builders and factories. Send your bill of materials and
            we will come back with one consolidated quotation, usually within a working day.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <Button asChild variant="cta" size="lg">
            <Link href="/request-quote">
              <FileText />
              Request a Quote
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <a href={`tel:${CONTACT.mobile.replace(/\s/g, '')}`}>Call {CONTACT.mobile}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

const INDUSTRIES = [
  { Icon: Factory, name: 'Manufacturing', body: 'Panel builds, machine retrofits and spares.' },
  { Icon: Shirt, name: 'Textile', body: 'Drives, sensors and motor control for looms and dyeing.' },
  { Icon: UtensilsCrossed, name: 'Food Processing', body: 'Washdown-rated sensors and hygienic control gear.' },
  { Icon: HardHat, name: 'Construction', body: 'Distribution boards, cable and site power.' },
  { Icon: Zap, name: 'Power & Energy', body: 'Switchgear, PFI capacitors and protection relays.' },
  { Icon: Cpu, name: 'Automation', body: 'PLCs, HMIs and the I/O to tie them together.' },
] as const;

export function Industries(): JSX.Element {
  return (
    <section className="border-y border-border bg-white py-14">
      <div className="container">
        <SectionHeading
          title="Industries We Serve"
          description="The same counter supplies a one-off replacement and a full plant fit-out."
        />

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map(({ Icon, name, body }) => (
            <li key={name}>
              <Link
                href={`/industries#${name.toLowerCase().replace(/\s|&/g, '-')}`}
                className="group flex h-full gap-4 rounded-lg border border-border bg-surface p-5 transition-all hover:border-brand-cyan hover:bg-white"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-white transition-colors group-hover:bg-brand-cyan">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
                    {name}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const REASONS = [
  'Authorised stockist for twelve manufacturers, so what you buy is genuine.',
  'Staff who can read a single-line diagram and tell you what actually fits.',
  'Real stock on the shelf at Bull Road — not a drop-ship catalogue.',
  'Trade pricing on bills of materials, quoted in writing within a working day.',
] as const;

export function WhyChooseUs(): JSX.Element {
  return (
    <section className="container py-14">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading title="Why Choose Fast Traders" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Fast Traders has supplied industrial and electrical equipment from Grace Tower on Bull
            Road, Lahore for years, under the direction of{' '}
            <strong className="font-semibold text-brand-navy">Sharjeel Bin Ejaz</strong>. We deal in
            all kinds of industrial equipment, parts and accessories — from a single miniature
            circuit breaker to the switchgear and automation for a complete plant.
          </p>

          <ul className="mt-6 space-y-3">
            {REASONS.map((reason) => (
              <li key={reason} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-cyan" aria-hidden />
                <span className="text-foreground">{reason}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/about">About the company</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">
                <Building2 />
                Visit the counter
              </Link>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          {[
            { value: '12', label: 'Authorised brands' },
            { value: '20+', label: 'Product categories' },
            { value: '1 day', label: 'Typical quote turnaround' },
            { value: 'Lahore', label: 'Same-day collection' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-white p-6 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-heading text-3xl font-extrabold text-brand-navy">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * Testimonials.
 *
 * Hard-coded placeholders until the client supplies real, attributable
 * quotes — inventing customer names for a live B2B site would be dishonest.
 */
const TESTIMONIALS = [
  {
    quote:
      'They had the Terasaki breaker on the shelf when nobody else in Lahore did. Saved us a week of downtime.',
    author: 'Placeholder — awaiting client approval',
    role: 'Panel builder, Lahore',
  },
  {
    quote:
      'Sent a bill of materials in the morning and had a full quotation the same afternoon. Pricing was fair.',
    author: 'Placeholder — awaiting client approval',
    role: 'Maintenance manager, textile mill',
  },
  {
    quote:
      'Good technical advice. They asked the right questions about the load before recommending a drive.',
    author: 'Placeholder — awaiting client approval',
    role: 'Consulting engineer',
  },
] as const;

export function Testimonials(): JSX.Element {
  return (
    <section className="border-t border-border bg-white py-14">
      <div className="container">
        <SectionHeading title="What Customers Say" />

        <ul className="grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <li key={item.role} className="flex flex-col rounded-lg border border-border bg-surface p-6">
              <Quote className="size-6 text-brand-cyan" aria-hidden />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                {item.quote}
              </blockquote>
              <footer className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold text-brand-navy">{item.author}</p>
                <p className="text-2xs text-muted-foreground">{item.role}</p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

## `client/src/components/home/product-sections.tsx`

```tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionHeading } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/feedback';
import { ProductCard } from '@/components/product/product-card';
import type { Product } from '@/types';

/** Featured carousel and the New Arrivals / Best Sellers tab pair. */

/**
 * Horizontal scroller.
 * CSS scroll-snap rather than a JS carousel — it costs nothing, works without
 * hydration, and behaves like a native swipe on a phone.
 */
export function FeaturedCarousel({ products }: { products: Product[] }): JSX.Element | null {
  if (products.length === 0) return null;

  return (
    <section className="container py-14">
      <SectionHeading
        title="Featured Products"
        description="Fast movers and current stock highlights."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/products?isFeatured=true">
              See all
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
        {products.map((product, index) => (
          <li key={product.id} className="w-[62vw] shrink-0 snap-start sm:w-64 lg:w-72">
            <ProductCard product={product} priority={index < 2} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ArrivalsAndBestSellers({
  newArrivals,
  bestSellers,
}: {
  newArrivals: Product[];
  bestSellers: Product[];
}): JSX.Element | null {
  if (newArrivals.length === 0 && bestSellers.length === 0) return null;

  return (
    <section className="border-y border-border bg-white py-14">
      <div className="container">
        <Tabs defaultValue="new">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-tight text-brand-navy sm:text-2xl">
                Latest &amp; Popular
              </h2>
              <span className="mt-2 block h-1 w-12 rounded-full bg-brand-cyan" aria-hidden />
            </div>
            <TabsList className="w-auto">
              <TabsTrigger value="new">New Arrivals</TabsTrigger>
              <TabsTrigger value="best">Best Sellers</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="new">
            <ProductGrid products={newArrivals} emptyLabel="No new arrivals just yet." />
          </TabsContent>
          <TabsContent value="best">
            <ProductGrid products={bestSellers} emptyLabel="No sales data yet." />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function ProductGrid({
  products,
  emptyLabel,
}: {
  products: Product[];
  emptyLabel: string;
}): JSX.Element {
  if (products.length === 0) {
    return <EmptyState title={emptyLabel} description="Check back shortly, or browse the full catalogue." />;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.slice(0, 8).map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
```

## `client/src/components/home/trust-strip.tsx`

```tsx
import { BadgeCheck, Headset, Layers, ShieldCheck, Truck } from 'lucide-react';

/** Five reassurances, directly under the hero — the classic B2B trust bar. */
const ITEMS = [
  { Icon: ShieldCheck, title: 'Genuine Products', body: 'Sourced through official channels' },
  { Icon: BadgeCheck, title: 'Authorized Brands', body: 'Stockist for 12 manufacturers' },
  { Icon: Truck, title: 'Fast Lahore Delivery', body: 'Same-day counter collection' },
  { Icon: Headset, title: 'Technical Support', body: 'Talk to someone who knows the part' },
  { Icon: Layers, title: '20+ Categories', body: 'Switchgear to automation' },
] as const;

export function TrustStrip(): JSX.Element {
  return (
    <section aria-label="Why buy from Fast Traders" className="border-b border-border bg-white">
      <ul className="container grid grid-cols-2 gap-x-4 gap-y-5 py-6 md:grid-cols-3 lg:grid-cols-5">
        {ITEMS.map(({ Icon, title, body }) => (
          <li key={title} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-navy">{title}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

## `client/src/components/product/product-actions.tsx`

```tsx
'use client';

import { useState } from 'react';
import { FileText, MessageCircle, ShoppingCart, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/commerce';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { CONTACT } from '@/lib/constants';
import { useCartStore } from '@/store/cart-store';
import { whatsappLink } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * The hybrid-commerce control panel.
 *
 *   retail -> quantity + Add to Cart + Buy Now
 *   quote  -> quantity + note + Request Quote
 *   both   -> all of the above
 *
 * WhatsApp is always offered with the product name and SKU pre-filled — for a
 * lot of Pakistani trade buyers that is the preferred channel.
 */
export function ProductActions({ product }: { product: Product }): JSX.Element {
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);
  const addToInquiry = useCartStore((state) => state.addToInquiry);

  const [qty, setQty] = useState(product.minOrderQty);
  const [note, setNote] = useState('');

  const buyable = product.pricingMode !== 'quote';
  const quotable = product.pricingMode !== 'retail';
  const soldOut = product.stock <= 0;

  const line = {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
    unit: product.unit,
    qty,
  };

  const onAddToCart = (): void => {
    addToCart({ ...line, ...(typeof product.price === 'number' ? { price: product.price } : {}) });
    toast.success('Added to cart', { description: `${qty} × ${product.name}` });
  };

  const onRequestQuote = (): void => {
    addToInquiry({ ...line, ...(note ? { note } : {}) });
    setNote('');
    toast.success('Added to your inquiry list', {
      description: 'Send the list when you are ready and we will price it.',
      action: { label: 'View list', onClick: () => router.push('/inquiry') },
    });
  };

  const whatsappMessage = `Hello Fast Traders, I am interested in:\n${product.name}\nSKU: ${product.sku}${
    product.partNumber ? `\nPart no: ${product.partNumber}` : ''
  }\nQuantity: ${qty} ${product.unit}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={qty}
          onChange={setQty}
          min={product.minOrderQty}
          max={buyable && !soldOut ? Math.max(product.stock, product.minOrderQty) : 9999}
          unit={product.unit}
        />
        {product.minOrderQty > 1 ? (
          <span className="text-xs text-muted-foreground">
            Minimum order {product.minOrderQty} {product.unit}
          </span>
        ) : null}
      </div>

      {buyable ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="cta" size="lg" block onClick={onAddToCart} disabled={soldOut}>
            <ShoppingCart />
            {soldOut ? 'Out of stock' : 'Add to cart'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            block
            disabled={soldOut}
            onClick={() => {
              onAddToCart();
              router.push('/checkout');
            }}
          >
            <Zap />
            Buy now
          </Button>
        </div>
      ) : null}

      {quotable ? (
        <div id="request-quote" className="scroll-mt-28 rounded-lg border border-border bg-surface p-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
            {buyable ? 'Need a bulk or trade price?' : 'Request a quotation'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add it to your inquiry list with any requirements and we will price it, usually within
            a working day.
          </p>

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Rating, poles, delivery date, or anything else we should know…"
            aria-label="Note for this quotation line"
            className="mt-3 min-h-[72px] bg-white"
          />

          <Button variant={buyable ? 'outline' : 'cta'} size="lg" block className="mt-3" onClick={onRequestQuote}>
            <FileText />
            {buyable ? 'Add to inquiry list' : 'Request quote'}
          </Button>
        </div>
      ) : null}

      <Button asChild variant="outline" size="lg" block className="border-[#25D366]/40 text-[#128C4B] hover:bg-[#25D366]/10">
        <a href={whatsappLink(CONTACT.whatsappDigits, whatsappMessage)} target="_blank" rel="noopener noreferrer">
          <MessageCircle />
          Ask on WhatsApp
        </a>
      </Button>
    </div>
  );
}
```

## `client/src/components/product/product-card.tsx`

```tsx
import Link from 'next/link';
import { FileText, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockBadge } from '@/components/ui/badge';
import { PriceDisplay, Rating } from '@/components/ui/commerce';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { ProductImage } from './product-image';

/**
 * Catalogue product card.
 *
 * A Server Component: the card itself is static markup, and only the buttons
 * (in `product-actions.tsx`) need client interactivity. That keeps the grid
 * cheap to render on a 3G connection.
 */

function brandOf(product: Product): { name: string; slug: string } | null {
  return typeof product.brand === 'string' ? null : product.brand;
}

export function ProductCard({
  product,
  priority,
  layout = 'grid',
}: {
  product: Product;
  priority?: boolean;
  layout?: 'grid' | 'list';
}): JSX.Element {
  const brand = brandOf(product);
  const href = `/products/${product.slug}`;
  const buyable = product.pricingMode !== 'quote';
  const quotable = product.pricingMode !== 'retail';

  if (layout === 'list') {
    return (
      <article className="flex gap-4 rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-card-hover">
        <Link href={href} className="shrink-0">
          <ProductImage
            image={product.images[0]}
            sku={product.sku}
            sizes="140px"
            priority={priority}
            className="size-32 rounded-md border border-border"
          />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <ProductMeta product={product} brand={brand} />
          <Link href={href} className="mt-1 line-clamp-2 font-semibold text-foreground hover:text-brand-cyan">
            {product.name}
          </Link>
          {product.shortDescription ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
            <PriceDisplay
              price={product.price}
              comparePrice={product.comparePrice}
              pricingMode={product.pricingMode}
              unit={product.unit}
            />
            <CardActions href={href} buyable={buyable} quotable={quotable} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-white transition-shadow hover:shadow-card-hover">
      <Link href={href} className="relative block aspect-square border-b border-border">
        <ProductImage
          image={product.images[0]}
          sku={product.sku}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          className="size-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {product.comparePrice && product.price && product.comparePrice > product.price ? (
          <span className="absolute left-2 top-2 rounded bg-destructive px-1.5 py-0.5 text-2xs font-bold text-white">
            −{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <ProductMeta product={product} brand={brand} />
        <Link href={href} className="mt-1.5 line-clamp-2 text-sm font-semibold text-foreground hover:text-brand-cyan">
          {product.name}
        </Link>

        {product.reviewCount > 0 ? (
          <Rating value={product.ratingAvg} count={product.reviewCount} size="sm" className="mt-2" />
        ) : null}

        <div className="mt-3">
          <PriceDisplay
            price={product.price}
            comparePrice={product.comparePrice}
            pricingMode={product.pricingMode}
            size="sm"
            unit={product.unit}
          />
        </div>

        <div className="mt-auto pt-4">
          <CardActions href={href} buyable={buyable} quotable={quotable} block />
        </div>
      </div>
    </article>
  );
}

function ProductMeta({
  product,
  brand,
}: {
  product: Product;
  brand: { name: string; slug: string } | null;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      {brand ? (
        <Link
          href={`/brands/${brand.slug}`}
          className="truncate text-2xs font-bold uppercase tracking-wide text-brand-cyan hover:underline"
        >
          {brand.name}
        </Link>
      ) : (
        <span />
      )}
      <StockBadge status={product.stockStatus} />
    </div>
  );
}

/**
 * Both calls to action are links to the detail page rather than direct
 * cart mutations: a trade buyer almost always wants to check the rating and
 * poles before committing, and it keeps the grid a Server Component.
 */
function CardActions({
  href,
  buyable,
  quotable,
  block,
}: {
  href: string;
  buyable: boolean;
  quotable: boolean;
  block?: boolean;
}): JSX.Element {
  return (
    <div className={cn('flex gap-2', block && 'flex-col')}>
      {buyable ? (
        <Button asChild variant="cta" size="sm" block={block}>
          <Link href={href}>
            <ShoppingCart />
            View &amp; buy
          </Link>
        </Button>
      ) : null}
      {quotable ? (
        <Button asChild variant={buyable ? 'outline' : 'cta'} size="sm" block={block}>
          <Link href={`${href}#request-quote`}>
            <FileText />
            {buyable ? 'Bulk price' : 'Request quote'}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
```

## `client/src/components/product/product-gallery.tsx`

```tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductImage as ProductImageType } from '@/types';

/**
 * Product gallery: large image with hover zoom, plus a thumbnail rail.
 *
 * Zoom is a CSS `transform-origin` follow rather than a lightbox — a trade
 * buyer usually wants to read the rating plate, and that works on touch too.
 */
export function ProductGallery({
  images,
  name,
  sku,
}: {
  images: ProductImageType[];
  name: string;
  sku: string;
}): JSX.Element {
  const gallery = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  const current = gallery[active];
  const src = current?.url ?? '/placeholders/default.svg';
  const isPlaceholder = !current || current.publicId.startsWith('placeholder/');

  const onMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="space-y-3">
      <div
        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-white"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMove}
      >
        <Image
          src={src}
          alt={current?.alt ?? `${name} — ${sku}`}
          fill
          sizes="(max-width: 1024px) 100vw, 45vw"
          priority
          className={cn(
            'object-contain transition-transform duration-200',
            zooming && !isPlaceholder && 'scale-[1.8]',
          )}
          style={{ transformOrigin: origin }}
        />

        {isPlaceholder ? (
          <span className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <span className="rounded bg-brand-navy/90 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-white">
              {sku}
            </span>
          </span>
        ) : (
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded bg-brand-navy/80 px-2 py-1 text-2xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            <ZoomIn className="size-3" />
            Hover to zoom
          </span>
        )}
      </div>

      {gallery.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((image, index) => (
            <li key={image.publicId}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${gallery.length}`}
                aria-current={index === active}
                className={cn(
                  'relative size-16 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors',
                  index === active ? 'border-brand-cyan' : 'border-border hover:border-brand-navy/40',
                )}
              >
                <Image src={image.url} alt="" fill sizes="64px" className="object-contain" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```

## `client/src/components/product/product-image.tsx`

```tsx
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ProductImage as ProductImageType } from '@/types';

/**
 * Product image with a branded fallback.
 *
 * Seeded products carry a local SVG placeholder (`publicId` starts with
 * `placeholder/`). When one is shown we overlay the SKU, so a catalogue
 * awaiting photography still reads as a real product rather than a blank tile.
 */
export function ProductImage({
  image,
  sku,
  sizes,
  priority,
  className,
  fill = true,
}: {
  image?: ProductImageType;
  sku: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fill?: boolean;
}): JSX.Element {
  const src = image?.url ?? '/placeholders/default.svg';
  const isPlaceholder = !image || image.publicId.startsWith('placeholder/');

  return (
    <div className={cn('relative overflow-hidden bg-white', className)}>
      <Image
        src={src}
        alt={image?.alt ?? `${sku} — product image`}
        {...(fill ? { fill: true } : { width: 600, height: 600 })}
        sizes={sizes}
        priority={priority}
        className="object-contain"
      />

      {isPlaceholder ? (
        <span className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded bg-brand-navy/90 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-white">
            {sku}
          </span>
        </span>
      ) : null}
    </div>
  );
}
```

## `client/src/components/product/product-tabs.tsx`

```tsx
import { Download, FileText, Truck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/feedback';
import { Rating } from '@/components/ui/commerce';
import type { Product, Specification } from '@/types';

/**
 * Description · Specifications · Datasheets · Reviews · Shipping & Returns.
 *
 * Every panel is `forceMount`ed. Radix unmounts inactive tabs by default,
 * which would keep the specification table out of the server-rendered HTML —
 * and specs are exactly what part-number searches match on ("MCCB 250A 36kA").
 * Radix still sets `hidden` on the inactive panels, so nothing is visible or
 * focusable until its tab is selected.
 */

/** Group specs by their `group` field so the table reads like a datasheet. */
function groupSpecs(specs: Specification[]): { group: string; rows: Specification[] }[] {
  const map = new Map<string, Specification[]>();

  for (const spec of specs) {
    const key = spec.group ?? 'General';
    map.set(key, [...(map.get(key) ?? []), spec]);
  }

  return [...map.entries()].map(([group, rows]) => ({ group, rows }));
}

export function ProductTabs({ product }: { product: Product }): JSX.Element {
  const groups = groupSpecs(product.specifications);

  return (
    <Tabs defaultValue="description" className="mt-12">
      <TabsList className="overflow-x-auto">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="specs">Specifications</TabsTrigger>
        <TabsTrigger value="datasheets">Datasheets</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="shipping">Shipping &amp; Returns</TabsTrigger>
      </TabsList>

      <TabsContent value="description" forceMount>
        <div
          className="prose-sm max-w-3xl text-sm leading-relaxed text-foreground [&_p]:mb-3 [&_strong]:text-brand-navy"
          // Description is rich text written by an admin, not by the public.
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      </TabsContent>

      <TabsContent value="specs" forceMount>
        {groups.length === 0 ? (
          <EmptyState
            title="No specifications listed yet"
            description="Ask us on WhatsApp with the part number and we will send the full datasheet."
          />
        ) : (
          <div className="max-w-3xl space-y-6">
            {groups.map(({ group, rows }) => (
              <div key={group}>
                <h3 className="mb-2 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                  {group}
                </h3>
                <dl className="divide-y divide-border rounded-lg border border-border bg-white">
                  {rows.map((spec) => (
                    <div key={spec.key} className="grid grid-cols-2 gap-4 px-4 py-2.5 text-sm">
                      <dt className="text-muted-foreground">{spec.key}</dt>
                      <dd className="font-medium text-foreground">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="datasheets" forceMount>
        {product.datasheets.length === 0 ? (
          <EmptyState
            title="No datasheet uploaded"
            description="Request one and we will email the manufacturer's PDF."
            icon={<FileText />}
          />
        ) : (
          <ul className="max-w-2xl space-y-2">
            {product.datasheets.map((sheet) => (
              <li key={sheet.publicId}>
                <a
                  href={sheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand-cyan"
                >
                  <FileText className="size-5 shrink-0 text-brand-cyan" aria-hidden />
                  <span className="flex-1 text-sm font-medium text-foreground">{sheet.title}</span>
                  <Download className="size-4 text-muted-foreground" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="reviews" forceMount>
        {product.reviewCount === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Reviews appear here once a verified customer leaves one."
          />
        ) : (
          <div className="max-w-2xl rounded-lg border border-border bg-white p-6">
            <div className="flex items-center gap-4">
              <span className="font-heading text-4xl font-extrabold text-brand-navy">
                {product.ratingAvg.toFixed(1)}
              </span>
              <div>
                <Rating value={product.ratingAvg} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on {product.reviewCount} verified review
                  {product.reviewCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="shipping" forceMount>
        <div className="max-w-2xl space-y-4 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <Truck className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div>
              <p className="font-semibold text-brand-navy">Delivery</p>
              <p className="mt-1">
                Lahore 1–2 working days, Punjab 2–4, rest of Pakistan 3–6. Free delivery applies
                above the thresholds shown at checkout. Same-day collection is available from our
                counter at Grace Tower, Bull Road.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-brand-cyan" aria-hidden />
            <div>
              <p className="font-semibold text-brand-navy">Returns &amp; warranty</p>
              <p className="mt-1">
                Report shortages or transit damage within 48 hours of delivery. Unused items in
                original packaging can be returned within 7 days. Warranty follows the
                manufacturer&rsquo;s terms for the brand concerned
                {product.warranty ? ` — this item: ${product.warranty}` : ''}.
              </p>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
```

## `client/src/components/product/recently-viewed.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { STORAGE_KEYS } from '@/lib/constants';
import { formatPKR } from '@/lib/utils';
import { ProductImage } from './product-image';
import type { Product } from '@/types';

/**
 * Recently viewed rail.
 *
 * Stored in localStorage rather than on the server — it is a browsing
 * convenience, not account data, and this keeps it working for guests without
 * a round trip.
 */

interface ViewedItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  image?: string;
  price?: number;
}

const MAX_ITEMS = 8;

function read(): ViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.recentlyViewed);
    return raw ? (JSON.parse(raw) as ViewedItem[]) : [];
  } catch {
    return [];
  }
}

/** Records the current product and renders everything viewed before it. */
export function RecentlyViewed({ current }: { current: Product }): JSX.Element | null {
  const [items, setItems] = useState<ViewedItem[]>([]);

  useEffect(() => {
    const previous = read().filter((item) => item.id !== current.id);
    setItems(previous.slice(0, MAX_ITEMS));

    const entry: ViewedItem = {
      id: current.id,
      name: current.name,
      slug: current.slug,
      sku: current.sku,
      ...(current.images[0]?.url ? { image: current.images[0].url } : {}),
      ...(typeof current.price === 'number' ? { price: current.price } : {}),
    };

    try {
      localStorage.setItem(
        STORAGE_KEYS.recentlyViewed,
        JSON.stringify([entry, ...previous].slice(0, MAX_ITEMS)),
      );
    } catch {
      // Private browsing or a full quota — the rail simply stays empty.
    }
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
        Recently viewed
      </h2>
      <span className="mt-2 block h-1 w-12 rounded-full bg-brand-cyan" aria-hidden />

      <ul className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.id} className="w-40 shrink-0">
            <Link
              href={`/products/${item.slug}`}
              className="block rounded-lg border border-border bg-white p-3 transition-shadow hover:shadow-card"
            >
              <ProductImage
                image={item.image ? { url: item.image, publicId: 'seen', alt: item.name, isPrimary: true } : undefined}
                sku={item.sku}
                sizes="160px"
                className="aspect-square rounded"
              />
              <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground">{item.name}</p>
              <p className="mt-1 text-xs font-bold text-brand-navy">
                {typeof item.price === 'number' ? formatPKR(item.price) : 'On request'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

## `client/src/components/catalog/catalog-view.tsx`

```tsx
'use client';

import { useState } from 'react';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTitle, SheetContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState, ProductCardSkeleton } from '@/components/ui/feedback';
import { ProductCard } from '@/components/product/product-card';
import { useProducts } from '@/lib/api/queries';
import type { CategoryNode, ProductFacets, ProductListResponse } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { FilterSidebar } from './filter-sidebar';
import { useCatalogFilters, type LayoutMode } from './use-catalog-filters';

/**
 * Interactive catalogue.
 *
 * The server renders the first page (good for SEO and first paint) and passes
 * it as `initialData`; every subsequent filter change is a client query keyed
 * on the URL, so the grid updates without a full navigation.
 */
export function CatalogView({
  initialData,
  categories,
  heading,
  lockedCategory,
}: {
  initialData: ProductListResponse | null;
  categories: CategoryNode[];
  heading: string;
  /** Set on category pages so the category cannot be filtered away. */
  lockedCategory?: string;
}): JSX.Element {
  const api = useCatalogFilters();
  const [layout, setLayout] = useState<LayoutMode>('grid');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = { ...api.filters, ...(lockedCategory ? { category: lockedCategory } : {}) };
  const { data, isPending, isError, refetch } = useProducts(query);

  // Fall back to the server-rendered page until the first client query lands.
  const result = data ?? initialData;
  const facets: ProductFacets | null = result?.facets ?? null;
  const products = result?.items ?? [];
  const meta = result?.meta;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-lg border border-border bg-white p-4">
          <FilterSidebar facets={facets} categories={categories} api={api} />
        </div>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {meta ? (
              <>
                <span className="font-semibold text-brand-navy">{meta.total}</span> {heading}
                {meta.totalPages > 1 ? ` · page ${meta.page} of ${meta.totalPages}` : null}
              </>
            ) : (
              'Loading…'
            )}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              <SlidersHorizontal />
              Filters
              {api.activeCount > 0 ? <Badge variant="accent">{api.activeCount}</Badge> : null}
            </Button>

            <Select value={api.filters.sort} onValueChange={(value) => api.setFilter({ sort: value })}>
              <SelectTrigger className="h-9 w-[168px]" aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="popular">Best selling</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden items-center rounded-lg border border-border sm:flex">
              {([
                ['grid', LayoutGrid, 'Grid view'],
                ['list', List, 'List view'],
              ] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayout(mode)}
                  aria-label={label}
                  aria-pressed={layout === mode}
                  className={cn(
                    'flex size-9 items-center justify-center transition-colors first:rounded-l-lg last:rounded-r-lg',
                    layout === mode ? 'bg-brand-navy text-white' : 'text-brand-navy hover:bg-brand-navy/5',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {isError && !result ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isPending && !result ? (
          <ProductSkeletonGrid />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products match those filters"
            description="Try widening the price range, clearing a brand, or searching by part number instead."
            action={
              api.activeCount > 0 ? (
                <Button variant="outline" size="sm" onClick={api.clearAll}>
                  Clear all filters
                </Button>
              ) : null
            }
          />
        ) : (
          <ul
            className={cn(
              layout === 'grid'
                ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'
                : 'flex flex-col gap-3',
            )}
          >
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} layout={layout} priority={index < 4} />
              </li>
            ))}
          </ul>
        )}

        {meta && meta.totalPages > 1 ? (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={(page) => {
              api.setFilter({ page });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-8"
          />
        ) : null}
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-lg">
          <div className="border-b border-border p-4">
            <DialogTitle>Filters</DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <FilterSidebar facets={facets} categories={categories} api={api} />
          </div>
          <div className="border-t border-border p-4">
            <Button variant="cta" block onClick={() => setDrawerOpen(false)}>
              Show {meta?.total ?? 0} products
            </Button>
          </div>
        </SheetContent>
      </Dialog>
    </div>
  );
}

function ProductSkeletonGrid(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        // eslint-disable-next-line react/no-array-index-key -- decorative
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
```

## `client/src/components/catalog/filter-sidebar.tsx`

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PriceRangeSlider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/tabs';
import { Chip } from '@/components/ui/badge';
import type { CategoryNode, ProductFacets } from '@/lib/api/types';
import type { CatalogFilterApi } from './use-catalog-filters';

/**
 * Faceted filter sidebar.
 *
 * Counts come from the API's facet aggregation, which computes each dimension
 * with its *own* filter removed — so ticking "Schneider" does not collapse the
 * brand list to a single entry.
 */
export function FilterSidebar({
  facets,
  categories,
  api,
}: {
  facets: ProductFacets | null;
  categories: CategoryNode[];
  api: CatalogFilterApi;
}): JSX.Element {
  const { filters, setFilter, toggleInList, toggleSpec, clearAll, activeCount } = api;

  const bounds = facets?.priceRange ?? { min: 0, max: 200000 };
  const [range, setRange] = useState<[number, number]>([
    filters.minPrice ?? bounds.min,
    filters.maxPrice ?? bounds.max,
  ]);

  const selectedBrands = (filters.brand ?? '').split(',').filter(Boolean);
  const selectedSpecs = (filters.specs ?? '').split('|').filter(Boolean);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2">
        <p className="font-heading text-sm font-bold uppercase tracking-wide text-brand-navy">
          Filters {activeCount > 0 ? <span className="text-brand-cyan">({activeCount})</span> : null}
        </p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" />
            Clear all
          </button>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {selectedBrands.map((slug) => (
            <Chip key={slug} label={slug} onRemove={() => toggleInList('brand', slug)} />
          ))}
          {selectedSpecs.map((token) => {
            const [key = '', ...rest] = token.split(':');
            return (
              <Chip
                key={token}
                label={rest.join(':')}
                onRemove={() => toggleSpec(key, rest.join(':'))}
              />
            );
          })}
          {filters.inStock ? (
            <Chip label="In stock" onRemove={() => setFilter({ inStock: undefined })} />
          ) : null}
          {filters.pricingMode ? (
            <Chip
              label={filters.pricingMode === 'quote' ? 'Quote only' : filters.pricingMode}
              onRemove={() => setFilter({ pricingMode: undefined })}
            />
          ) : null}
        </div>
      ) : null}

      <Accordion type="multiple" defaultValue={['categories', 'brands', 'price', 'availability']}>
        {categories.length > 0 ? (
          <AccordionItem value="categories">
            <AccordionTrigger>Category</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/categories/${category.slug}`}
                      className="flex items-center justify-between py-1 text-sm text-foreground hover:text-brand-cyan"
                    >
                      {category.name}
                      <span className="text-2xs text-muted-foreground">{category.productCount}</span>
                    </Link>
                    {category.children.length > 0 ? (
                      <ul className="ml-3 border-l border-border pl-3">
                        {category.children.map((child) => (
                          <li key={child.id}>
                            <Link
                              href={`/categories/${child.slug}`}
                              className="flex items-center justify-between py-0.5 text-xs text-muted-foreground hover:text-brand-cyan"
                            >
                              {child.name}
                              <span className="text-2xs">{child.productCount}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {facets && facets.brands.length > 0 ? (
          <AccordionItem value="brands">
            <AccordionTrigger>Brand</AccordionTrigger>
            <AccordionContent>
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {facets.brands.map((bucket) => (
                  <li key={bucket.value} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`brand-${bucket.value}`}
                      checked={selectedBrands.includes(bucket.value)}
                      onCheckedChange={() => toggleInList('brand', bucket.value)}
                    />
                    <Label htmlFor={`brand-${bucket.value}`} className="flex-1 font-normal">
                      {bucket.label}
                    </Label>
                    <span className="text-2xs text-muted-foreground">{bucket.count}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="price">
          <AccordionTrigger>Price</AccordionTrigger>
          <AccordionContent>
            <PriceRangeSlider
              min={bounds.min}
              max={bounds.max}
              value={range}
              onValueChange={setRange}
            />
            <Button
              size="sm"
              variant="outline"
              block
              className="mt-3"
              onClick={() => setFilter({ minPrice: range[0], maxPrice: range[1] })}
            >
              Apply price
            </Button>
            <p className="mt-2 text-2xs text-muted-foreground">
              Quote-only products have no listed price and are excluded by this filter.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="availability">
          <AccordionTrigger>Availability &amp; buying</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="filter-instock"
                  checked={filters.inStock === true}
                  onCheckedChange={(checked) => setFilter({ inStock: checked === true })}
                />
                <Label htmlFor="filter-instock" className="font-normal">
                  In stock only
                </Label>
              </div>

              {(facets?.pricingModes ?? []).map((bucket) => (
                <div key={bucket.value} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`mode-${bucket.value}`}
                    checked={filters.pricingMode === bucket.value}
                    onCheckedChange={(checked) =>
                      setFilter({ pricingMode: checked === true ? bucket.value : undefined })
                    }
                  />
                  <Label htmlFor={`mode-${bucket.value}`} className="flex-1 font-normal">
                    {bucket.label}
                  </Label>
                  <span className="text-2xs text-muted-foreground">{bucket.count}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {(facets?.specs ?? []).map((group) => (
          <AccordionItem key={group.key} value={`spec-${group.key}`}>
            <AccordionTrigger>{group.key}</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {group.values.map((bucket) => {
                  const token = `${group.key}:${bucket.value}`;
                  return (
                    <li key={token} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`spec-${token}`}
                        checked={selectedSpecs.includes(token)}
                        onCheckedChange={() => toggleSpec(group.key, bucket.value)}
                      />
                      <Label htmlFor={`spec-${token}`} className="flex-1 font-normal">
                        {bucket.label}
                      </Label>
                      <span className="text-2xs text-muted-foreground">{bucket.count}</span>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
```

## `client/src/components/catalog/use-catalog-filters.ts`

```ts
'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ProductQueryParams } from '@/lib/api/catalog';

/**
 * Filter state lives in the URL, not in React state.
 *
 * That makes every filtered view shareable, bookmarkable and back-button
 * friendly — which matters when a buyer sends a colleague "the 250 A MCCBs we
 * looked at". It also means the server component and the client query read
 * from the same source.
 */

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'name';
export type LayoutMode = 'grid' | 'list';

export interface CatalogFilters extends ProductQueryParams {
  page: number;
  sort: SortOption;
}

const SORTS: SortOption[] = ['newest', 'price_asc', 'price_desc', 'popular', 'name'];

/** Parse the current search params into a typed query object. */
export function parseFilters(params: URLSearchParams): CatalogFilters {
  const number = (key: string): number | undefined => {
    const raw = params.get(key);
    if (raw === null || raw === '') return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };

  const sort = params.get('sort');
  const pricingMode = params.get('pricingMode');

  return {
    page: number('page') ?? 1,
    limit: number('limit') ?? 24,
    sort: SORTS.includes(sort as SortOption) ? (sort as SortOption) : 'newest',
    ...(params.get('category') ? { category: params.get('category') as string } : {}),
    ...(params.get('brand') ? { brand: params.get('brand') as string } : {}),
    ...(number('minPrice') !== undefined ? { minPrice: number('minPrice') } : {}),
    ...(number('maxPrice') !== undefined ? { maxPrice: number('maxPrice') } : {}),
    ...(params.get('inStock') === 'true' ? { inStock: true } : {}),
    ...(pricingMode === 'retail' || pricingMode === 'quote' || pricingMode === 'both'
      ? { pricingMode }
      : {}),
    ...(params.get('tags') ? { tags: params.get('tags') as string } : {}),
    ...(params.get('search') ? { search: params.get('search') as string } : {}),
    ...(params.get('specs') ? { specs: params.get('specs') as string } : {}),
  };
}

export interface CatalogFilterApi {
  filters: CatalogFilters;
  /** Merge a patch into the URL. Any change except `page` resets to page 1. */
  setFilter: (patch: Record<string, string | number | boolean | undefined>) => void;
  /** Add or remove one value from a comma-separated parameter. */
  toggleInList: (key: 'brand' | 'tags', value: string) => void;
  /** Add or remove one `Key:Value` spec filter. */
  toggleSpec: (key: string, value: string) => void;
  clearAll: () => void;
  activeCount: number;
}

const FILTER_KEYS = ['category', 'brand', 'minPrice', 'maxPrice', 'inStock', 'pricingMode', 'tags', 'specs'];

export function useCatalogFilters(): CatalogFilterApi {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams)), [searchParams]);

  const push = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      // `scroll: false` keeps the shopper's place in the grid when they tick a box.
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setFilter = useCallback(
    (patch: Record<string, string | number | boolean | undefined>) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || value === false) next.delete(key);
        else next.set(key, String(value));
      }

      if (!Object.hasOwn(patch, 'page')) next.delete('page');
      push(next);
    },
    [push, searchParams],
  );

  const toggleInList = useCallback(
    (key: 'brand' | 'tags', value: string) => {
      const next = new URLSearchParams(searchParams);
      const current = (next.get(key) ?? '').split(',').filter(Boolean);
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (updated.length === 0) next.delete(key);
      else next.set(key, updated.join(','));

      next.delete('page');
      push(next);
    },
    [push, searchParams],
  );

  const toggleSpec = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      const token = `${key}:${value}`;
      const current = (next.get('specs') ?? '').split('|').filter(Boolean);
      const updated = current.includes(token)
        ? current.filter((item) => item !== token)
        : [...current, token];

      if (updated.length === 0) next.delete('specs');
      else next.set('specs', updated.join('|'));

      next.delete('page');
      push(next);
    },
    [push, searchParams],
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    // The search term and sort survive a filter reset; the filters do not.
    FILTER_KEYS.forEach((key) => next.delete(key));
    next.delete('page');
    push(next);
  }, [push, searchParams]);

  const activeCount = FILTER_KEYS.reduce((count, key) => {
    const value = searchParams.get(key);
    if (!value) return count;
    if (key === 'brand' || key === 'tags') return count + value.split(',').filter(Boolean).length;
    if (key === 'specs') return count + value.split('|').filter(Boolean).length;
    return count + 1;
  }, 0);

  return { filters, setFilter, toggleInList, toggleSpec, clearAll, activeCount };
}
```

## `client/src/app/page.tsx`

```tsx
import type { Metadata } from 'next';
import { HeroSlider } from '@/components/home/hero';
import { TrustStrip } from '@/components/home/trust-strip';
import { BrandGrid, CategoryGrid } from '@/components/home/discovery';
import { ArrivalsAndBestSellers, FeaturedCarousel } from '@/components/home/product-sections';
import { Industries, RfqBanner, Testimonials, WhyChooseUs } from '@/components/home/marketing';
import { ContactStrip } from '@/components/home/contact-strip';
import { JsonLd } from '@/components/shared/json-ld';
import {
  getBanners,
  getBestSellers,
  getBrands,
  getCategoryTree,
  getFeaturedProducts,
  getNewArrivals,
} from '@/lib/api/catalog';
import { buildMetadata, TARGET_KEYWORDS, localBusinessSchema, organizationSchema, websiteSchema } from '@/lib/seo';
import { SITE } from '@/lib/constants';

/** Homepage regenerates every 5 minutes along with the rest of the catalogue. */
export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — Industrial & Electrical Equipment Supplier in Lahore`,
  description:
    'Circuit breakers, cables, contactors, PLCs, VFDs and automation parts in Lahore. Authorised stockist for Terasaki, Schneider Electric, Mitsubishi, Fuji, Hager, Autonics and more.',
  path: '/',
  keywords: TARGET_KEYWORDS,
});

export default async function HomePage(): Promise<JSX.Element> {
  // One parallel wave — a slow endpoint delays the page by its own latency,
  // not the sum of all six.
  const [banners, categories, brands, featured, newArrivals, bestSellers] = await Promise.all([
    getBanners('hero'),
    getCategoryTree(),
    getBrands(true),
    getFeaturedProducts(10),
    getNewArrivals(8),
    getBestSellers(8),
  ]);

  return (
    <>
      <JsonLd schemas={[organizationSchema(), localBusinessSchema(), websiteSchema()]} />

      <HeroSlider banners={banners ?? []} />
      <TrustStrip />
      <CategoryGrid categories={categories ?? []} />
      <FeaturedCarousel products={featured?.items ?? []} />
      <BrandGrid brands={brands ?? []} />
      <RfqBanner />
      <ArrivalsAndBestSellers
        newArrivals={newArrivals?.items ?? []}
        bestSellers={bestSellers?.items ?? []}
      />
      <Industries />
      <WhyChooseUs />
      <Testimonials />
      <ContactStrip />
    </>
  );
}
```

## `client/src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { AnnouncementBar, FloatingWhatsApp, Footer, Header, ScrollToTop } from '@/components/layout';
import { MobileBottomNav } from '@/components/layout/header/mobile-nav';
import { getSettings } from '@/lib/api/catalog';
import { SITE } from '@/lib/constants';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Industrial & Electrical Equipment, Lahore`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.shortDescription,
  applicationName: SITE.name,
  keywords: [
    'industrial equipment Lahore',
    'electrical equipment Pakistan',
    'circuit breakers Lahore',
    'MCB MCCB ACB supplier',
    'Schneider Electric Pakistan',
    'PLC HMI VFD Lahore',
  ],
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.shortDescription,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B2A6B',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  // Announcement copy is editable in the admin panel.
  const settings = await getSettings();
  const announcement = settings?.announcement;

  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface">
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-toast rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Skip to content
        </a>

        <Providers>
          {announcement?.isActive ? (
            <AnnouncementBar text={announcement.text} link={announcement.link} />
          ) : null}

          <Header />

          {/* Bottom padding clears the sticky mobile nav. */}
          <main id="main" className="pb-16 lg:pb-0">
            {children}
          </main>

          <Footer />

          <FloatingWhatsApp />
          <ScrollToTop />
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
```

## `client/src/app/products/page.tsx`

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/pagination';
import { CatalogView } from '@/components/catalog/catalog-view';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategoryTree, getProducts, type ProductQueryParams } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, itemListSchema, TARGET_KEYWORDS } from '@/lib/seo';
import { parseFilters } from '@/components/catalog/use-catalog-filters';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'All Products — Circuit Breakers, Cables, Automation & Control',
  description:
    'Browse the full Fast Traders catalogue: MCBs, MCCBs, ACBs, contactors, relays, PLCs, VFDs, sensors, cables and control gear from twelve authorised brands. Lahore, Pakistan.',
  path: '/products',
  keywords: TARGET_KEYWORDS,
});

/**
 * Catalogue listing.
 *
 * The first page is rendered on the server so crawlers and a cold 3G load both
 * get real products; `CatalogView` then takes over for filtering.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<JSX.Element> {
  // Normalise through the same parser the client hook uses, so the server
  // render and the first client query produce an identical result.
  const flat = new URLSearchParams(
    Object.entries(searchParams).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? (value[0] ?? '') : value] as [string, string]],
    ),
  );
  const filters = parseFilters(flat) as ProductQueryParams;

  const [initial, categories] = await Promise.all([getProducts(filters), getCategoryTree()]);

  return (
    <div className="container py-8">
      <JsonLd
        schemas={[
          breadcrumbSchema([{ name: 'Products', path: '/products' }]),
          ...(initial ? [itemListSchema(initial.items, (product) => `/products/${product.slug}`)] : []),
        ]}
      />

      <Breadcrumb items={[{ label: 'Products' }]} className="mb-4" />

      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
          {filters.search ? `Search: “${filters.search}”` : 'All Products'}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Industrial and electrical equipment from Terasaki, Schneider Electric, Mitsubishi, Fuji,
          Hager, Autonics, IDEC, Pilz, WAGO and more. Priced items can be bought online; anything
          quote-only goes to your inquiry list.
        </p>
      </header>

      <Suspense fallback={null}>
        <CatalogView initialData={initial} categories={categories ?? []} heading="products" />
      </Suspense>
    </div>
  );
}
```

## `client/src/app/products/[slug]/page.tsx`

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/pagination';
import { StockBadge } from '@/components/ui/badge';
import { PriceDisplay, Rating } from '@/components/ui/commerce';
import { JsonLd } from '@/components/shared/json-ld';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductActions } from '@/components/product/product-actions';
import { ProductTabs } from '@/components/product/product-tabs';
import { ProductCard } from '@/components/product/product-card';
import { RecentlyViewed } from '@/components/product/recently-viewed';
import { getProduct } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, productSchema } from '@/lib/seo';
import type { Brand, Category, Product } from '@/types';

export const revalidate = 300;

const named = (value: string | Category | Brand | null | undefined): { name: string; slug: string } | null =>
  value && typeof value !== 'string' ? { name: value.name, slug: value.slug } : null;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getProduct(params.slug);

  if (!data) {
    return buildMetadata({
      title: 'Product not found',
      description: 'This product is no longer listed.',
      path: `/products/${params.slug}`,
      noIndex: true,
    });
  }

  const { product } = data;
  const brand = named(product.brand);

  // Part numbers are what trade buyers actually paste into Google.
  const keywords = [
    product.name,
    product.sku,
    ...(product.partNumber ? [product.partNumber] : []),
    ...(brand ? [`${brand.name} Lahore`, `${brand.name} dealer Pakistan`] : []),
    ...product.tags,
  ];

  return buildMetadata({
    title: product.seo?.title ?? `${product.name} — Price in Pakistan`,
    description:
      product.seo?.description ??
      product.shortDescription ??
      `${product.name}. ${brand ? `${brand.name} · ` : ''}SKU ${product.sku}. In stock in Lahore.`,
    path: `/products/${product.slug}`,
    keywords,
    ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
  });
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const data = await getProduct(params.slug);
  if (!data) notFound();

  const { product, related } = data;
  const brand = named(product.brand);
  const category = named(product.category);
  const subCategory = named(product.subCategory);
  const path = `/products/${product.slug}`;

  return (
    <div className="container py-8">
      <JsonLd
        schemas={[
          productSchema(product, path),
          breadcrumbSchema([
            { name: 'Products', path: '/products' },
            ...(category ? [{ name: category.name, path: `/categories/${category.slug}` }] : []),
            { name: product.name, path },
          ]),
        ]}
      />

      <Breadcrumb
        className="mb-5"
        items={[
          { label: 'Products', href: '/products' },
          ...(category ? [{ label: category.name, href: `/categories/${category.slug}` }] : []),
          ...(subCategory ? [{ label: subCategory.name, href: `/categories/${subCategory.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} sku={product.sku} />

        <div>
          <div className="flex flex-wrap items-center gap-3">
            {brand ? (
              <Link
                href={`/brands/${brand.slug}`}
                className="text-xs font-bold uppercase tracking-wide text-brand-cyan hover:underline"
              >
                {brand.name}
              </Link>
            ) : null}
            <StockBadge status={product.stockStatus} />
            {product.isNewArrival ? (
              <span className="rounded bg-brand-navy px-1.5 py-0.5 text-2xs font-bold uppercase text-white">
                New
              </span>
            ) : null}
          </div>

          <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            {product.name}
          </h1>

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>SKU</dt>
              <dd className="font-semibold text-foreground">{product.sku}</dd>
            </div>
            {product.partNumber ? (
              <div className="flex gap-1.5">
                <dt>Part no.</dt>
                <dd className="font-semibold text-foreground">{product.partNumber}</dd>
              </div>
            ) : null}
          </dl>

          {product.reviewCount > 0 ? (
            <Rating value={product.ratingAvg} count={product.reviewCount} className="mt-3" />
          ) : null}

          {product.shortDescription ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-5 border-y border-border py-5">
            <PriceDisplay
              price={product.price}
              comparePrice={product.comparePrice}
              pricingMode={product.pricingMode}
              unit={product.unit}
              size="lg"
            />
            {product.pricingMode !== 'quote' ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Inclusive of {product.taxRate}% sales tax where applicable.
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            <ProductActions product={product} />
          </div>
        </div>
      </div>

      <ProductTabs product={product} />

      {related.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
            Related products
          </h2>
          <span className="mt-2 block h-1 w-12 rounded-full bg-brand-cyan" aria-hidden />

          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {related.slice(0, 4).map((item: Product) => (
              <li key={item.id}>
                <ProductCard product={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RecentlyViewed current={product} />
    </div>
  );
}
```

## `client/src/app/categories/[slug]/page.tsx`

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/pagination';
import { CatalogView } from '@/components/catalog/catalog-view';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategory, getCategoryTree, getProducts } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getCategory(params.slug);

  if (!data) {
    return buildMetadata({
      title: 'Category not found',
      description: 'This category is no longer available.',
      path: `/categories/${params.slug}`,
      noIndex: true,
    });
  }

  const { category } = data;
  const title = category.seo?.title ?? `${category.name} — Buy in Lahore, Pakistan`;

  return buildMetadata({
    title,
    description:
      category.seo?.description ??
      `${category.name} from authorised brands, in stock in Lahore. ${category.description ?? ''}`.trim(),
    path: `/categories/${category.slug}`,
    keywords: category.seo?.keywords,
    ...(category.image ? { image: category.image } : {}),
  });
}

/** Category landing: description, subcategory chips, then the filtered grid. */
export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const data = await getCategory(params.slug);
  if (!data) notFound();

  const { category, breadcrumbs, children, productCount } = data;

  const [initial, tree] = await Promise.all([
    getProducts({ category: category.slug, limit: 24 }),
    getCategoryTree(),
  ]);

  const crumbs = [
    ...breadcrumbs.map((crumb) => ({ name: crumb.name, path: `/categories/${crumb.slug}` })),
    { name: category.name, path: `/categories/${category.slug}` },
  ];

  return (
    <div className="container py-8">
      <JsonLd
        schemas={[
          breadcrumbSchema(crumbs),
          ...(initial ? [itemListSchema(initial.items, (product) => `/products/${product.slug}`)] : []),
        ]}
      />

      <Breadcrumb
        className="mb-4"
        items={[
          ...breadcrumbs.map((crumb) => ({ label: crumb.name, href: `/categories/${crumb.slug}` })),
          { label: category.name },
        ]}
      />

      <header className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{category.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">{productCount} products</p>

        {children.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/categories/${child.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-brand-navy transition-colors hover:border-brand-cyan hover:text-brand-cyan"
                >
                  {child.name}
                  <span className="text-2xs text-muted-foreground">{child.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <Suspense fallback={null}>
        <CatalogView
          initialData={initial}
          categories={tree ?? []}
          heading="products"
          lockedCategory={category.slug}
        />
      </Suspense>
    </div>
  );
}
```

## `client/src/app/brands/page.tsx`

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { JsonLd } from '@/components/shared/json-ld';
import { getBrands } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: 'Authorised Brands — Terasaki, Schneider, Mitsubishi, Fuji & More',
  description:
    'Fast Traders is an authorised stockist for Terasaki, National, Fuji Electric, Mitsubishi Electric, Hager, Schneider Electric, Autonics, IDEC, DELAB, Pilz, WAGO and Torex in Lahore, Pakistan.',
  path: '/brands',
  keywords: ['Schneider Electric dealer Lahore', 'Terasaki Pakistan', 'Mitsubishi Electric Lahore'],
});

export default async function BrandsPage(): Promise<JSX.Element> {
  const brands = await getBrands(true);

  return (
    <div className="container py-8">
      <JsonLd schemas={[breadcrumbSchema([{ name: 'Brands', path: '/brands' }])]} />

      <Breadcrumb items={[{ label: 'Brands' }]} className="mb-4" />

      <header className="mb-8">
        <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
          Brands We Deal In
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          We are an authorised stockist and supplier for the manufacturers below. Everything we
          sell is sourced through official channels — click a brand to see what we hold.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(brands ?? []).map((brand) => (
          <li key={brand.id}>
            <Link
              href={`/brands/${brand.slug}`}
              className="group flex h-full flex-col rounded-lg border border-border bg-white p-6 transition-all hover:border-brand-cyan hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-bold uppercase tracking-tight text-brand-navy">
                    {brand.name}
                  </p>
                  {brand.country ? (
                    <p className="mt-0.5 text-2xs uppercase tracking-wide text-muted-foreground">
                      {brand.country}
                    </p>
                  ) : null}
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-cyan" />
              </div>

              {brand.description ? (
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {brand.description}
                </p>
              ) : null}

              {typeof brand.productCount === 'number' ? (
                <p className="mt-4 text-xs font-semibold text-brand-cyan">
                  {brand.productCount} products in stock
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## `client/src/app/brands/[slug]/page.tsx`

```tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Globe } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { CatalogView } from '@/components/catalog/catalog-view';
import { JsonLd } from '@/components/shared/json-ld';
import { getBrands, getCategoryTree, getProducts } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, itemListSchema } from '@/lib/seo';
import { SITE } from '@/lib/constants';

export const revalidate = 300;

/** Brands are a small, stable set, so resolve by slug from the full list. */
async function findBrand(slug: string) {
  const brands = await getBrands(true);
  return brands?.find((brand) => brand.slug === slug) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = await findBrand(params.slug);

  if (!brand) {
    return buildMetadata({
      title: 'Brand not found',
      description: 'This brand is no longer listed.',
      path: `/brands/${params.slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${brand.name} — Authorised Dealer in Lahore, Pakistan`,
    description:
      brand.description ??
      `Buy genuine ${brand.name} products from Fast Traders, an authorised stockist in Lahore, Pakistan.`,
    path: `/brands/${brand.slug}`,
    keywords: [
      `${brand.name} Lahore`,
      `${brand.name} dealer Pakistan`,
      `${brand.name} price in Pakistan`,
    ],
    ...(brand.logo ? { image: brand.logo } : {}),
  });
}

export default async function BrandPage({
  params,
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const brand = await findBrand(params.slug);
  if (!brand) notFound();

  const [initial, tree] = await Promise.all([
    getProducts({ brand: brand.slug, limit: 24 }),
    getCategoryTree(),
  ]);

  return (
    <div className="container py-8">
      <JsonLd
        schemas={[
          {
            '@type': 'Brand',
            '@id': `${SITE.url}/brands/${brand.slug}#brand`,
            name: brand.name,
            ...(brand.description ? { description: brand.description } : {}),
            ...(brand.website ? { sameAs: brand.website } : {}),
          },
          breadcrumbSchema([
            { name: 'Brands', path: '/brands' },
            { name: brand.name, path: `/brands/${brand.slug}` },
          ]),
          ...(initial ? [itemListSchema(initial.items, (product) => `/products/${product.slug}`)] : []),
        ]}
      />

      <Breadcrumb
        className="mb-4"
        items={[{ label: 'Brands', href: '/brands' }, { label: brand.name }]}
      />

      <header className="mb-6 rounded-lg border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-extrabold uppercase tracking-tight text-brand-navy sm:text-3xl">
              {brand.name}
            </h1>
            {brand.country ? (
              <p className="mt-1 text-2xs uppercase tracking-wide text-muted-foreground">
                {brand.country}
              </p>
            ) : null}
          </div>

          {brand.website ? (
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-cyan hover:underline"
            >
              <Globe className="size-3.5" aria-hidden />
              Manufacturer site
            </a>
          ) : null}
        </div>

        {brand.description ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {brand.description}
          </p>
        ) : null}
      </header>

      <Suspense fallback={null}>
        <CatalogView initialData={initial} categories={tree ?? []} heading={`${brand.name} products`} />
      </Suspense>
    </div>
  );
}
```
