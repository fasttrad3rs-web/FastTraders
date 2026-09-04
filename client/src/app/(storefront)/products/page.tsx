import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/ui/pagination';
import { CatalogView } from '@/components/catalog/catalog-view';
import { JsonLd } from '@/components/shared/json-ld';
import { getCategoryTree, getProducts, type ProductQueryParams } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata, itemListSchema, TARGET_KEYWORDS } from '@/lib/seo';
// Imported from `filters`, not `use-catalog-filters`: the latter is a
// `'use client'` module, and a Server Component importing from one receives a
// client reference proxy rather than the function.
import { parseFilters } from '@/components/catalog/filters';

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
          Hager, Autonics, IDEC, Pilz, WAGO and more. Add anything you need to your inquiry list and
          we will come back with a price, or call us on +92 324 4234990 for a quote today.
        </p>
      </header>

      <Suspense fallback={null}>
        <CatalogView initialData={initial} categories={categories ?? []} heading="products" />
      </Suspense>
    </div>
  );
}
