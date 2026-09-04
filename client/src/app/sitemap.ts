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

/*
 * `/submit-inquiry` and `/inquiry-list` are deliberately absent: both are
 * meaningless without a shortlist in the visitor's own browser, so a crawler
 * would index a page that says "there is nothing on your list yet".
 * `robots.ts` blocks them and the pages carry `noindex` — all three have to
 * agree, and the verification harness checks that they do.
 */
const STATIC_ROUTES: { path: string; priority: number; frequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, frequency: 'daily' },
  { path: '/products', priority: 0.9, frequency: 'daily' },
  /*
   * Indexed, unlike /submit-inquiry: "where to buy <obsolete part> in Lahore"
   * is exactly the search this page answers, and sourcing is a real service
   * rather than a per-visitor form.
   */
  { path: '/source-from-china', priority: 0.8, frequency: 'monthly' },
  { path: '/brands', priority: 0.7, frequency: 'weekly' },
  { path: '/industries', priority: 0.6, frequency: 'monthly' },
  { path: '/about', priority: 0.6, frequency: 'monthly' },
  { path: '/contact', priority: 0.7, frequency: 'monthly' },
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
        lastModified: product.createdAt ? new Date(product.createdAt) : now,
        changeFrequency: 'weekly',
        priority: product.isFeatured ? 0.8 : 0.7,
      });
    }

    if (!result.meta.hasNext) break;
    page += 1;
  }

  return entries;
}
