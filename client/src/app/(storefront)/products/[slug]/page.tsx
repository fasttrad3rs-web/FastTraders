import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/pagination';
import { AvailabilityBadge, PriceOnRequest, SourcingCTA } from '@/components/shared';
import { JsonLd } from '@/components/shared/json-ld';
import { ProductGallery } from '@/components/product/product-gallery';
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
        <ProductGallery
          images={product.images}
          name={product.name}
          sku={product.sku}
          brand={brand}
        />

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
            <AvailabilityBadge value={product.availability} size="sm" />
            {product.isNewArrival ? (
              <span className="rounded bg-brand-navy px-1.5 py-0.5 text-2xs font-bold uppercase text-white">
                New
              </span>
            ) : null}
            {product.isImportItem ? (
              <span className="rounded border border-brand-navy/25 px-1.5 py-0.5 text-2xs font-bold uppercase text-brand-navy">
                Imported
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

          {product.shortDescription ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-5 border-y border-border py-5">
            <AvailabilityBadge
              value={product.availability}
              {...(product.leadTime ? { leadTime: product.leadTime } : {})}
            />

            <div className="mt-4">
              <PriceOnRequest product={product} size="lg" />
            </div>

            {/* The three things a trade buyer checks before ringing anyone. */}
            <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="text-success">Genuine products</span>
              <span aria-hidden>·</span>
              <span>Authorized brands</span>
              <span aria-hidden>·</span>
              <span>Lahore delivery</span>
            </p>
          </div>

          <SourcingCTA productSlug={product.slug} className="mt-5" />
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
