import Link from 'next/link';
import { FileText, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AvailabilityBadge, PriceOnRequest } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { ProductImage } from './product-image';

/**
 * Catalogue product card.
 *
 * A Server Component: the card itself is static markup, and only the buttons
 * (the shared contact components) need client interactivity. That keeps the grid
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

  if (layout === 'list') {
    return (
      <article className="flex gap-4 rounded-lg border border-border bg-white p-4 transition-shadow hover:shadow-card-hover">
        <Link href={href} className="shrink-0">
          <ProductImage
            image={product.images[0]}
            sku={product.sku}
            brand={brand}
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
            <PriceOnRequest product={product} size="sm" actions={false} />
            <CardActions href={href} />
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
          brand={brand}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          className="size-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {product.isImportItem ? (
          <span className="absolute left-2 top-2 rounded bg-brand-navy px-1.5 py-0.5 text-2xs font-bold text-white">
            Imported
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <ProductMeta product={product} brand={brand} />
        <Link href={href} className="mt-1.5 line-clamp-2 text-sm font-semibold text-foreground hover:text-brand-cyan">
          {product.name}
        </Link>


        <div className="mt-3">
          <PriceOnRequest product={product} size="sm" actions={false} />
        </div>

        <div className="mt-auto pt-4">
          <CardActions href={href} block />
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
      <AvailabilityBadge value={product.availability} size="sm" />
    </div>
  );
}

/**
 * Both actions route to the detail page rather than firing an enquiry from the
 * grid — a buyer almost always wants the specifications before asking, and it
 * keeps the grid a Server Component.
 */
function CardActions({ href, block }: { href: string; block?: boolean }): JSX.Element {
  return (
    <div className={cn('flex gap-2', block && 'flex-col')}>
      <Button asChild variant="cta" size="sm" block={block}>
        <Link href={href}>
          <FileText />
          Enquire
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm" block={block}>
        <Link href={`${href}#enquire`}>
          <MessageCircle />
          Ask price
        </Link>
      </Button>
    </div>
  );
}
