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
    /*
     * No `aggregateRating` either. Ratings can only come from testimonials an
     * admin typed in, which is not an aggregate of verified buyers — emitting
     * one would be fabricating a review signal for the search results page.
     */
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

  /*
   * CATALOGUE-ONLY: no `offers` node, ever.
   *
   * Fast Traders publishes no prices, and a Product without an offer is valid
   * schema.org. Emitting a figure we do not actually quote would be wrong and
   * a Merchant Center violation. Brand, SKU and MPN are what part-number
   * searches match on, and those are all present above.
   */
  return base;
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
