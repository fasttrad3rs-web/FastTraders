import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Breadcrumb } from '@/components/ui/pagination';
import { JsonLd } from '@/components/shared/json-ld';
import { getBrands } from '@/lib/api/catalog';
import { breadcrumbSchema, buildMetadata } from '@/lib/seo';
import { BrandLogo } from '@/components/shared/brand-logo';

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
              {/* The mark first — a panel builder scans for it before the name. */}
              <span className="mb-4 flex h-12 w-40 items-center justify-start">
                <BrandLogo
                  slug={brand.slug}
                  name={brand.name}
                  className="items-center justify-start bg-transparent p-0"
                  sizes="160px"
                />
              </span>

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
