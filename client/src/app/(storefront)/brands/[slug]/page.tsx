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
