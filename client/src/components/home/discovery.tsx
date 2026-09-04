import Link from 'next/link';
import * as Icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/separator';
import type { BrandWithCount, CategoryNode } from '@/lib/api/types';
import { BrandLogo } from '@/components/shared/brand-logo';

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
                {/*
                  The logo carries the recognition; the name underneath keeps
                  it searchable, readable to assistive tech, and legible if an
                  image ever fails. Fixed-height box so a wide mark and a tall
                  one occupy the same space and the grid stays even.
                */}
                <span className="flex h-9 w-full items-center justify-center">
                  <BrandLogo
                    slug={brand.slug}
                    name={brand.name}
                    className="bg-transparent p-0"
                    sizes="(max-width: 640px) 40vw, 160px"
                  />
                </span>
                <span className="font-heading text-2xs font-bold uppercase tracking-wide text-brand-navy/70 transition-colors group-hover:text-brand-navy">
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
