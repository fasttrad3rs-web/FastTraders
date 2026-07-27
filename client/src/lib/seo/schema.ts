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
